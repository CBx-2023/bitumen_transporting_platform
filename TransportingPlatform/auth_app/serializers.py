
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import WechatAuth, SmsVerification

User = get_user_model()


class WechatLoginSerializer(serializers.Serializer):
    """微信小程序登录序列化器"""
    
    code = serializers.CharField(required=True, help_text='微信登录临时凭证')
    user_info = serializers.JSONField(required=False, help_text='用户信息')
    phone = serializers.CharField(required=False, help_text='手机号')
    
    class Meta:
        fields = ['code', 'user_info', 'phone']


class SmsVerificationSerializer(serializers.Serializer):
    """短信验证码序列化器"""
    
    phone = serializers.CharField(required=True, help_text='手机号')
    purpose = serializers.ChoiceField(choices=SmsVerification.Purpose.choices, required=True, help_text='用途')
    
    class Meta:
        fields = ['phone', 'purpose']


class SmsLoginSerializer(serializers.Serializer):
    """短信登录序列化器"""
    
    phone = serializers.CharField(required=True, help_text='手机号')
    code = serializers.CharField(required=True, help_text='验证码')
    
    class Meta:
        fields = ['phone', 'code']


class TokenRefreshSerializer(serializers.Serializer):
    """令牌刷新序列化器"""
    
    refresh = serializers.CharField(required=True, help_text='刷新令牌')
    
    class Meta:
        fields = ['refresh']


class TokenVerifySerializer(serializers.Serializer):
    """令牌验证序列化器"""
    
    token = serializers.CharField(required=True, help_text='访问令牌')
    
    class Meta:
        fields = ['token']


class TokenBlacklistSerializer(serializers.Serializer):
    """令牌黑名单序列化器"""
    
    refresh = serializers.CharField(required=True, help_text='刷新令牌')
    
    class Meta:
        fields = ['refresh']


class UserInfoSerializer(serializers.ModelSerializer):
    """用户信息序列化器"""
    
    class Meta:
        model = User
        fields = ['id', 'phone', 'role', 'avatar', 'company', 'credit_score', 'date_joined', 'last_login']
        read_only_fields = ['id', 'date_joined', 'last_login']