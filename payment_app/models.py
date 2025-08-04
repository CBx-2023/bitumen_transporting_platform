
from django.db import models
from order_app.models import Order
from user_app.models import User


class Payment(models.Model):
    """支付模型"""
    
    # 支付类型选项
    class Type(models.TextChoices):
        DEPOSIT = 'deposit', '定金'
        BALANCE = 'balance', '尾款'
        FULL = 'full', '全款'
        REFUND = 'refund', '退款'
    
    # 支付方式选项
    class Method(models.TextChoices):
        WECHAT = 'wechat', '微信支付'
        ALIPAY = 'alipay', '支付宝'
        BANK_TRANSFER = 'bank_transfer', '银行转账'
        CASH = 'cash', '现金'
        OTHER = 'other', '其他'
    
    # 支付状态选项
    class Status(models.TextChoices):
        PENDING = 'pending', '待支付'
        SUCCESS = 'success', '支付成功'
        FAILED = 'failed', '支付失败'
        CANCELLED = 'cancelled', '已取消'
        REFUNDED = 'refunded', '已退款'
    
    # 基本信息
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments', verbose_name='订单')
    payment_number = models.CharField(max_length=32, unique=True, verbose_name='支付编号')
    payer = models.ForeignKey(User, on_delete=models.PROTECT, related_name='payments_made', verbose_name='付款人')
    payee = models.ForeignKey(User, on_delete=models.PROTECT, related_name='payments_received', verbose_name='收款人')
    
    # 支付信息
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='金额')
    payment_type = models.CharField(max_length=20, choices=Type.choices, verbose_name='支付类型')
    payment_method = models.CharField(max_length=20, choices=Method.choices, verbose_name='支付方式')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name='支付状态')
    
    # 第三方支付信息
    transaction_id = models.CharField(max_length=64, null=True, blank=True, verbose_name='交易ID')
    transaction_data = models.JSONField(null=True, blank=True, verbose_name='交易数据')
    
    # 备注
    remark = models.TextField(null=True, blank=True, verbose_name='备注')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name='支付时间')
    
    class Meta:
        verbose_name = '支付'
        verbose_name_plural = '支付'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"支付 {self.payment_number} - {self.get_status_display()}"


class PaymentLog(models.Model):
    """支付日志模型"""
    
    # 日志类型选项
    class Type(models.TextChoices):
        CREATE = 'create', '创建支付'
        UPDATE = 'update', '更新支付'
        NOTIFY = 'notify', '支付通知'
        REFUND = 'refund', '退款'
        ERROR = 'error', '错误'
    
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='logs', verbose_name='支付')
    log_type = models.CharField(max_length=20, choices=Type.choices, verbose_name='日志类型')
    content = models.TextField(verbose_name='日志内容')
    data = models.JSONField(null=True, blank=True, verbose_name='日志数据')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    
    class Meta:
        verbose_name = '支付日志'
        verbose_name_plural = '支付日志'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"支付 {self.payment.payment_number} 的 {self.get_log_type_display()} 日志"


class Wallet(models.Model):
    """钱包模型"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet', verbose_name='用户')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='余额')
    frozen_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='冻结金额')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '钱包'
        verbose_name_plural = '钱包'
    
    def __str__(self):
        return f"{self.user.phone} 的钱包"


class WalletTransaction(models.Model):
    """钱包交易记录模型"""
    
    # 交易类型选项
    class Type(models.TextChoices):
        DEPOSIT = 'deposit', '充值'
        WITHDRAW = 'withdraw', '提现'
        PAYMENT = 'payment', '支付'
        REFUND = 'refund', '退款'
        ADJUSTMENT = 'adjustment', '调整'
    
    # 交易状态选项
    class Status(models.TextChoices):
        PENDING = 'pending', '处理中'
        SUCCESS = 'success', '成功'
        FAILED = 'failed', '失败'
        CANCELLED = 'cancelled', '已取消'
    
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions', verbose_name='钱包')
    transaction_number = models.CharField(max_length=32, unique=True, verbose_name='交易编号')
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='金额')
    balance_before = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='交易前余额')
    balance_after = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='交易后余额')
    
    transaction_type = models.CharField(max_length=20, choices=Type.choices, verbose_name='交易类型')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name='交易状态')
    
    # 关联信息
    related_order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='wallet_transactions', verbose_name='关联订单')
    related_payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='wallet_transactions', verbose_name='关联支付')
    
    # 备注
    remark = models.TextField(null=True, blank=True, verbose_name='备注')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '钱包交易记录'
        verbose_name_plural = '钱包交易记录'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.wallet.user.phone} 的 {self.get_transaction_type_display()} 交易"