
from django.urls import path
from .views import (
    WechatLoginView, SmsVerificationView, SmsLoginView,
    CustomTokenRefreshView, CustomTokenVerifyView, TokenBlacklistView,
    UserInfoView
)

app_name = 'auth_app'

urlpatterns = [
    # 微信登录
    path('wechat/login/', WechatLoginView.as_view(), name='wechat_login'),
    
    # 短信验证码
    path('sms/send/', SmsVerificationView.as_view(), name='sms_send'),
    path('sms/login/', SmsLoginView.as_view(), name='sms_login'),
    
    # JWT令牌
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', CustomTokenVerifyView.as_view(), name='token_verify'),
    path('token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
    
    # 用户信息
    path('user/info/', UserInfoView.as_view(), name='user_info'),
]