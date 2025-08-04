
from django.db import models
from user_app.models import User


class Goods(models.Model):
    """货源信息模型"""
    
    # 货源状态选项
    class Status(models.TextChoices):
        PENDING = 'pending', '待接单'
        ACCEPTED = 'accepted', '已接单'
        IN_TRANSIT = 'in_transit', '运输中'
        COMPLETED = 'completed', '已完成'
        CANCELLED = 'cancelled', '已取消'
    
    # 基本信息
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goods', verbose_name='货主')
    title = models.CharField(max_length=100, verbose_name='标题')
    description = models.TextField(null=True, blank=True, verbose_name='描述')
    
    # 货物信息
    weight = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='重量(吨)')
    volume = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='体积(立方米)')
    goods_type = models.CharField(max_length=50, default='沥青', verbose_name='货物类型')
    
    # 位置信息
    from_location = models.CharField(max_length=255, verbose_name='装货地点')
    from_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='装货地点经度')
    from_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='装货地点纬度')
    
    to_location = models.CharField(max_length=255, verbose_name='卸货地点')
    to_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='卸货地点经度')
    to_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='卸货地点纬度')
    
    # 时间和价格信息
    loading_time = models.DateTimeField(verbose_name='装货时间')
    expected_arrival_time = models.DateTimeField(null=True, blank=True, verbose_name='期望到达时间')
    expected_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='期望价格')
    
    # 状态信息
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name='状态')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '货源信息'
        verbose_name_plural = '货源信息'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.from_location}到{self.to_location}"


class GoodsImage(models.Model):
    """货源图片模型"""
    
    goods = models.ForeignKey(Goods, on_delete=models.CASCADE, related_name='images', verbose_name='货源')
    image_url = models.URLField(max_length=255, verbose_name='图片URL')
    description = models.CharField(max_length=100, null=True, blank=True, verbose_name='图片描述')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    
    class Meta:
        verbose_name = '货源图片'
        verbose_name_plural = '货源图片'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.goods.title}的图片"