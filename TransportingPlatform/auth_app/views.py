
import os
import json
import logging
import requests
from datetime import datetime, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction

from rest_framework import status, viewsets, mixins
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from rest_framework_simplejwt.exceptions import TokenError

from .models import WechatAuth, SmsVerification, LoginLog, BlacklistedToken
from .serializers import (
    WechatLoginSerializer, SmsVerificationSerializer, SmsLoginSerializer,
    TokenRefreshSerializer, TokenVerifySerializer, TokenBlacklistSerializer,
    UserInfoSerializer
)

User = get_user_model()
logger = logging.getLogger(__name__)


class WechatLoginView(APIView):
    """微信小程序登录视图"""
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        微信小程序登录
        
        使用微信小程序登录凭证code进行登录，如果用户不存在则自动创建
        """
        serializer = WechatLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        code = serializer.validated_data.get('code')
        user_info = serializer.validated_data.get('user_info', {})
        phone = serializer.validated_data.get('phone')
        
        # 获取微信小程序配置
        appid = os.getenv('WX_APPID')
        secret = os.getenv('WX_SECRET')
        
        if not appid or not secret:
            return Response(
                {'error': '微信小程序配置不完整'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # 请求微信API获取openid和session_key
        try:
            url = f'https://api.weixin.qq.com/sns/jscode2session?appid={appid}&secret={secret}&js_code={code}&grant_type=authorization_code'
            response = requests.get(url)
            data = response.json()
            
            if 'errcode' in data and data['errcode'] != 0:
                logger.error(f"微信登录失败: {data}")
                return Response(
                    {'error': f"微信登录失败: {data.get('errmsg', '未知错误')}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            openid = data.get('openid')
            session_key = data.get('session_key')
            unionid = data.get('unionid')
            
            if not openid:
                return Response(
                    {'error': '获取openid失败'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 查找或创建用户
            with transaction.atomic():
                try:
                    wechat_auth = WechatAuth.objects.select_related('user').get(openid=openid)
                    user = wechat_auth.user
                    
                    # 更新session_key
                    wechat_auth.session_key = session_key
                    if unionid:
                        wechat_auth.unionid = unionid
                    
                    # 更新微信用户信息
                    if user_info:
                        wechat_auth.nickname = user_info.get('nickName')
                        wechat_auth.avatar_url = user_info.get('avatarUrl')
                        wechat_auth.gender = user_info.get('gender')
                        wechat_auth.country = user_info.get('country')
                        wechat_auth.province = user_info.get('province')
                        wechat_auth.city = user_info.get('city')
                        wechat_auth.language = user_info.get('language')
                    
                    wechat_auth.last_login = timezone.now()
                    wechat_auth.save()
                    
                except WechatAuth.DoesNotExist:
                    # 创建新用户
                    if phone:
                        # 如果提供了手机号，查找是否已存在该手机号的用户
                        try:
                            user = User.objects.get(phone=phone)
                        except User.DoesNotExist:
                            user = User.objects.create(
                                phone=phone,
                                openid=openid,
                                avatar=user_info.get('avatarUrl') if user_info else None
                            )
                    else:
                        # 如果没有提供手机号，创建一个临时用户，后续需要绑定手机号
                        user = User.objects.create(
                            phone=f"wx_{openid[:8]}",  # 临时手机号
                            openid=openid,
                            avatar=user_info.get('avatarUrl') if user_info else None
                        )
                    
                    # 创建微信认证信息
                    wechat_auth = WechatAuth.objects.create(
                        user=user,
                        openid=openid,
                        unionid=unionid,
                        session_key=session_key,
                        nickname=user_info.get('nickName') if user_info else None,
                        avatar_url=user_info.get('avatarUrl') if user_info else None,
                        gender=user_info.get('gender') if user_info else None,
                        country=user_info.get('country') if user_info else None,
                        province=user_info.get('province') if user_info else None,
                        city=user_info.get('city') if user_info else None,
                        language=user_info.get('language') if user_info else None,
                        last_login=timezone.now()
                    )
            
            # 记录登录日志
            LoginLog.objects.create(
                user=user,
                login_type=LoginLog.Type.WECHAT,
                status=LoginLog.Status.SUCCESS,
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT'),
                device_id=request.data.get('device_id')
            )
            
            # 生成JWT令牌
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserInfoSerializer(user).data,
                'is_new_user': wechat_auth.created_at == wechat_auth.updated_at,
                'needs_phone_binding': not phone and user.phone.startswith('wx_')
            })
            
        except Exception as e:
            logger.exception(f"微信登录异常: {str(e)}")
            return Response(
                {'error': f"微信登录异常: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        """获取客户端IP地址"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SmsVerificationView(APIView):
    """短信验证码视图"""
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        发送短信验证码
        
        向指定手机号发送短信验证码
        """
        serializer = SmsVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        phone = serializer.validated_data.get('phone')
        purpose = serializer.validated_data.get('purpose')
        
        # 检查是否频繁发送
        last_minute = timezone.now() - timedelta(minutes=1)
        if SmsVerification.objects.filter(phone=phone, created_at__gt=last_minute).exists():
            return Response(
                {'error': '发送过于频繁，请稍后再试'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # 生成验证码
        import random
        code = ''.join(random.choices('0123456789', k=6))
        
        # 设置过期时间
        expires_at = timezone.now() + timedelta(minutes=5)
        
        # 保存验证码
        SmsVerification.objects.create(
            phone=phone,
            code=code,
            purpose=purpose,
            expires_at=expires_at
        )
        
        # TODO: 调用短信发送服务发送验证码
        # 这里只是模拟发送，实际项目中需要集成短信服务商的API
        logger.info(f"向 {phone} 发送验证码: {code}, 用途: {purpose}")
        
        return Response({'message': '验证码已发送'})


class SmsLoginView(APIView):
    """短信登录视图"""
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        短信验证码登录
        
        使用手机号和短信验证码进行登录，如果用户不存在则自动创建
        """
        serializer = SmsLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        phone = serializer.validated_data.get('phone')
        code = serializer.validated_data.get('code')
        
        # 验证短信验证码
        now = timezone.now()
        try:
            sms_verification = SmsVerification.objects.filter(
                phone=phone,
                code=code,
                purpose=SmsVerification.Purpose.LOGIN,
                is_used=False,
                expires_at__gt=now
            ).latest('created_at')
        except SmsVerification.DoesNotExist:
            return Response(
                {'error': '验证码无效或已过期'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 标记验证码为已使用
        sms_verification.is_used = True
        sms_verification.used_at = now
        sms_verification.save()
        
        # 查找或创建用户
        try:
            user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            user = User.objects.create(phone=phone)
        
        # 记录登录日志
        LoginLog.objects.create(
            user=user,
            login_type=LoginLog.Type.SMS,
            status=LoginLog.Status.SUCCESS,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            device_id=request.data.get('device_id')
        )
        
        # 生成JWT令牌
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserInfoSerializer(user).data
        })
    
    def get_client_ip(self, request):
        """获取客户端IP地址"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class CustomTokenRefreshView(TokenRefreshView):
    """自定义令牌刷新视图"""
    
    serializer_class = TokenRefreshSerializer


class CustomTokenVerifyView(TokenVerifyView):
    """自定义令牌验证视图"""
    
    serializer_class = TokenVerifySerializer


class TokenBlacklistView(APIView):
    """令牌黑名单视图"""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        将令牌加入黑名单
        
        用于用户登出操作，将刷新令牌加入黑名单
        """
        serializer = TokenBlacklistSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        refresh_token = serializer.validated_data.get('refresh')
        
        try:
            # 解析刷新令牌
            token = RefreshToken(refresh_token)
            
            # 获取用户ID
            user_id = token.get('user_id')
            user = User.objects.get(id=user_id) if user_id else None
            
            # 获取过期时间
            exp = token.get('exp')
            expires_at = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else None
            
            # 将令牌加入黑名单
            BlacklistedToken.objects.create(
                token=refresh_token,
                user=user,
                reason='用户登出',
                expires_at=expires_at or (timezone.now() + timedelta(days=7))
            )
            
            # 使令牌无效
            token.blacklist()
            
            return Response({'message': '成功登出'})
            
        except TokenError as e:
            return Response(
                {'error': f"令牌错误: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception(f"登出异常: {str(e)}")
            return Response(
                {'error': f"登出异常: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserInfoView(APIView):
    """用户信息视图"""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        获取当前用户信息
        """
        user = request.user
        serializer = UserInfoSerializer(user)
        return Response(serializer.data)