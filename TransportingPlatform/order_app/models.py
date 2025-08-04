
from django.db import models
from user_app.models import User
from goods_app.models import Goods
from vehicle_app.models import Vehicle


class Order(models.Model):
    """订单模型"""
    
    # 订单状态选项
    class Status(models.TextChoices):
        PENDING_PAYMENT = 'pending_payment', '待支付'
        PENDING_LOADING = 'pending_loading', '待装货'
        IN_TRANSIT = 'in_transit', '运输中'
        DELIVERED = 'delivered', '已送达'
        COMPLETED = 'completed', '已完成'
        CANCELLED = 'cancelled', '已取消'
        DISPUTED = 'disputed', '有争议'
    
    # 支付状态选项
    class PaymentStatus(models.TextChoices):
        UNPAID = 'unpaid', '未支付'
        PARTIAL_PAID = 'partial_paid', '部分支付'
        PAID = 'paid', '已支付'
        REFUNDED = 'refunded', '已退款'
    
    # 基本信息
    order_number = models.CharField(max_length=20, unique=True, verbose_name='订单编号')
    goods = models.ForeignKey(Goods, on_delete=models.PROTECT, related_name='orders', verbose_name='货源')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name='orders', verbose_name='车辆')
    shipper = models.ForeignKey(User, on_delete=models.PROTECT, related_name='shipper_orders', verbose_name='货主')
    driver = models.ForeignKey(User, on_delete=models.PROTECT, related_name='driver_orders', verbose_name='车主')
    
    # 价格信息
    freight_fee = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='运费')
    deposit = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='定金')
    other_fees = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='其他费用')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='总金额')
    
    # 状态信息
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING_PAYMENT, verbose_name='订单状态')
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID, verbose_name='支付状态')
    
    # 时间信息
    expected_loading_time = models.DateTimeField(verbose_name='预计装货时间')
    actual_loading_time = models.DateTimeField(null=True, blank=True, verbose_name='实际装货时间')
    expected_delivery_time = models.DateTimeField(verbose_name='预计送达时间')
    actual_delivery_time = models.DateTimeField(null=True, blank=True, verbose_name='实际送达时间')
    
    # 备注信息
    shipper_notes = models.TextField(null=True, blank=True, verbose_name='货主备注')
    driver_notes = models.TextField(null=True, blank=True, verbose_name='车主备注')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '订单'
        verbose_name_plural = '订单'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"订单 {self.order_number} - {self.get_status_display()}"


class OrderStatusLog(models.Model):
    """订单状态日志"""
    
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_logs', verbose_name='订单')
    from_status = models.CharField(max_length=20, choices=Order.Status.choices, verbose_name='原状态')
    to_status = models.CharField(max_length=20, choices=Order.Status.choices, verbose_name='新状态')
    operator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='operated_logs', verbose_name='操作人')
    remark = models.TextField(null=True, blank=True, verbose_name='备注')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    
    class Meta:
        verbose_name = '订单状态日志'
        verbose_name_plural = '订单状态日志'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"订单 {self.order.order_number} 状态从 {self.get_from_status_display()} 变更为 {self.get_to_status_display()}"


class OrderDocument(models.Model):
    """订单文档"""
    
    # 文档类型选项
    class Type(models.TextChoices):
        LOADING_RECEIPT = 'loading_receipt', '装货单'
        DELIVERY_RECEIPT = 'delivery_receipt', '送货单'
        INVOICE = 'invoice', '发票'
        CONTRACT = 'contract', '合同'
        OTHER = 'other', '其他'
    
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='documents', verbose_name='订单')
    document_type = models.CharField(max_length=20, choices=Type.choices, verbose_name='文档类型')
    document_url = models.URLField(max_length=255, verbose_name='文档URL')
    description = models.CharField(max_length=100, null=True, blank=True, verbose_name='文档描述')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    
    class Meta:
        verbose_name = '订单文档'
        verbose_name_plural = '订单文档'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"订单 {self.order.order_number} 的 {self.get_document_type_display()}"


class Rating(models.Model):
    """评价模型"""
    
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='ratings', verbose_name='订单')
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='given_ratings', verbose_name='评价人')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_ratings', verbose_name='被评价人')
    rating = models.DecimalField(max_digits=2, decimal_places=1, verbose_name='评分')
    comment = models.TextField(null=True, blank=True, verbose_name='评价内容')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    
    class Meta:
        verbose_name = '评价'
        verbose_name_plural = '评价'
        ordering = ['-created_at']
        unique_together = ['order', 'from_user', 'to_user']  # 一个订单中，一个用户只能对另一个用户评价一次
    
    def __str__(self):
        return f"{self.from_user} 对 {self.to_user} 的评价: {self.rating}"