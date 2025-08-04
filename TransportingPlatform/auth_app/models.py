
from django.db import models
from user_app.models import User


class WechatAuth(models.Model):
    """微信认证信息模型"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wechat_auth', verbose_name='用户')
    openid = models.CharField(max_length=64, unique=True, verbose_name='OpenID')
    unionid = models.CharField(max_length=64, null=True, blank=True, verbose_name='UnionID')
    session_key = models.CharField(max_length=128, verbose_name='会话密钥')
    
    # 微信用户信息
    nickname = models.CharField(max_length=50, null=True, blank=True, verbose_name='微信昵称')
    avatar_url = models.URLField(max_length=255, null=True, blank=True, verbose_name='头像URL')
    gender = models.IntegerField(null=True, blank=True, verbose_name='性别')  # 0: 未知, 1: 男, 2: 女
    country = models.CharField(max_length=50, null=True, blank=True, verbose_name='国家')
    province = models.CharField(max_length=50, null=True, blank=True, verbose_name='省份')
    city = models.CharField(max_length=50, null=True, blank=True, verbose_name='城市')
    language = models.CharField(max_length=20, null=True, blank=True, verbose_name='语言')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    last_login = models.DateTimeField(null=True, blank=True, verbose_name='最后登录时间')
    
    class Meta:
        verbose_name = '微信认证信息'
        verbose_name_plural = '微信认证信息'
    
    def __str__(self):
        return f"{self.user.phone} 的微信认证"


class LoginLog(models.Model):
    """登录日志模型"""
    
    # 登录类型选项
    class Type(models.TextChoices):
        WECHAT = 'wechat', '微信登录'
        PASSWORD = 'password', '密码登录'
        SMS = 'sms', '短信验证码登录'
        TOKEN = 'token', '令牌登录'
    
    # 登录状态选项
    class Status(models.TextChoices):
        SUCCESS = 'success', '成功'
        FAILED = 'failed', '失败'
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_logs', null=True, blank=True, verbose_name='用户')
    login_type = models.CharField(max_length=20, choices=Type.choices, verbose_name='登录类型')
    status = models.CharField(max_length=20, choices=Status.choices, verbose_name='登录状态')
    
    # 设备信息
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP地址')
    user_agent = models.TextField(null=True, blank=True, verbose_name='User Agent')
    device_id = models.CharField(max_length=64, null=True, blank=True, verbose_name='设备ID')
    
    # 失败信息
    error_message = models.TextField(null=True, blank=True, verbose_name='错误信息')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    
    class Meta:
        verbose_name = '登录日志'
        verbose_name_plural = '登录日志'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
        ]
    
    def __str__(self):
        user_info = self.user.phone if self.user else '未知用户'
        return f"{user_info} 的 {self.get_login_type_display()} 登录 - {self.get_status_display()}"


class SmsVerification(models.Model):
    """短信验证码模型"""
    
    # 验证码用途选项
    class Purpose(models.TextChoices):
        LOGIN = 'login', '登录'
        REGISTER = 'register', '注册'
        RESET_PASSWORD = 'reset_password', '重置密码'
        BIND_PHONE = 'bind_phone', '绑定手机'
        OTHER = 'other', '其他'
    
    phone = models.CharField(max_length=11, verbose_name='手机号')
    code = models.CharField(max_length=6, verbose_name='验证码')
    purpose = models.CharField(max_length=20, choices=Purpose.choices, verbose_name='用途')
    
    # 验证状态
    is_used = models.BooleanField(default=False, verbose_name='是否已使用')
    used_at = models.DateTimeField(null=True, blank=True, verbose_name='使用时间')
    
    # 过期时间
    expires_at = models.DateTimeField(verbose_name='过期时间')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    
    class Meta:
        verbose_name = '短信验证码'
        verbose_name_plural = '短信验证码'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.phone} 的 {self.get_purpose_display()} 验证码"


class BlacklistedToken(models.Model):
    """黑名单令牌模型，用于存储已注销的JWT令牌"""
    
    token = models.TextField(verbose_name='令牌')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blacklisted_tokens', null=True, blank=True, verbose_name='用户')
    
    # 黑名单原因
    reason = models.CharField(max_length=100, null=True, blank=True, verbose_name='原因')
    
    # 过期时间
    expires_at = models.DateTimeField(verbose_name='过期时间')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    
    class Meta:
        verbose_name = '黑名单令牌'
        verbose_name_plural = '黑名单令牌'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        user_info = self.user.phone if self.user else '未知用户'
        return f"{user_info} 的黑名单令牌"