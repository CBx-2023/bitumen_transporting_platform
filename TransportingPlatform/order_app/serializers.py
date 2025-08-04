
from rest_framework import serializers
from .models import Order, OrderStatusLog, OrderDocument, Rating
from user_app.serializers import UserSerializer
from goods_app.serializers import GoodsSerializer
from vehicle_app.serializers import VehicleSerializer


class OrderDocumentSerializer(serializers.ModelSerializer):
    """订单文档序列化器"""
    
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    
    class Meta:
        model = OrderDocument
        fields = ['id', 'document_type', 'document_type_display', 'document_url', 'description', 'created_at']
        read_only_fields = ['id', 'document_type_display', 'created_at']


class OrderStatusLogSerializer(serializers.ModelSerializer):
    """订单状态日志序列化器"""
    
    from_status_display = serializers.CharField(source='get_from_status_display', read_only=True)
    to_status_display = serializers.CharField(source='get_to_status_display', read_only=True)
    operator_name = serializers.CharField(source='operator.phone', read_only=True)
    
    class Meta:
        model = OrderStatusLog
        fields = ['id', 'from_status', 'from_status_display', 'to_status', 'to_status_display', 
                  'operator', 'operator_name', 'remark', 'created_at']
        read_only_fields = ['id', 'from_status_display', 'to_status_display', 'operator_name', 'created_at']


class RatingSerializer(serializers.ModelSerializer):
    """评价序列化器"""
    
    from_user_name = serializers.CharField(source='from_user.phone', read_only=True)
    to_user_name = serializers.CharField(source='to_user.phone', read_only=True)
    
    class Meta:
        model = Rating
        fields = ['id', 'from_user', 'from_user_name', 'to_user', 'to_user_name', 
                  'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'from_user_name', 'to_user_name', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    """订单序列化器"""
    
    documents = OrderDocumentSerializer(many=True, read_only=True)
    status_logs = OrderStatusLogSerializer(many=True, read_only=True)
    ratings = RatingSerializer(many=True, read_only=True)
    
    shipper = UserSerializer(read_only=True)
    driver = UserSerializer(read_only=True)
    goods = GoodsSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'goods', 'vehicle', 'shipper', 'driver',
            'freight_fee', 'deposit', 'other_fees', 'total_amount',
            'status', 'status_display', 'payment_status', 'payment_status_display',
            'expected_loading_time', 'actual_loading_time',
            'expected_delivery_time', 'actual_delivery_time',
            'shipper_notes', 'driver_notes',
            'documents', 'status_logs', 'ratings',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'status_display', 'payment_status_display',
            'created_at', 'updated_at'
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    """订单创建序列化器"""
    
    class Meta:
        model = Order
        fields = [
            'goods', 'vehicle', 'freight_fee', 'deposit', 'other_fees',
            'expected_loading_time', 'expected_delivery_time',
            'shipper_notes', 'driver_notes'
        ]
    
    def validate(self, data):
        """验证订单创建数据"""
        goods = data.get('goods')
        vehicle = data.get('vehicle')
        
        # 验证货源状态
        if goods.status != 'pending':
            raise serializers.ValidationError({'goods': '只能为待接单状态的货源创建订单'})
        
        # 验证车辆状态
        if vehicle.status != 'available':
            raise serializers.ValidationError({'vehicle': '只能为空闲状态的车辆创建订单'})
        
        # 计算总金额
        freight_fee = data.get('freight_fee', 0)
        deposit = data.get('deposit', 0)
        other_fees = data.get('other_fees', 0)
        data['total_amount'] = freight_fee + other_fees
        
        return data


class OrderUpdateSerializer(serializers.ModelSerializer):
    """订单更新序列化器"""
    
    class Meta:
        model = Order
        fields = [
            'freight_fee', 'deposit', 'other_fees',
            'expected_loading_time', 'actual_loading_time',
            'expected_delivery_time', 'actual_delivery_time',
            'shipper_notes', 'driver_notes', 'status', 'payment_status'
        ]
    
    def validate(self, data):
        """验证订单更新数据"""
        # 如果更新了金额相关字段，重新计算总金额
        if 'freight_fee' in data or 'other_fees' in data:
            freight_fee = data.get('freight_fee', self.instance.freight_fee)
            other_fees = data.get('other_fees', self.instance.other_fees)
            data['total_amount'] = freight_fee + other_fees
        
        return data


class OrderStatusUpdateSerializer(serializers.Serializer):
    """订单状态更新序列化器"""
    
    status = serializers.ChoiceField(choices=Order.Status.choices, required=True)
    remark = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        fields = ['status', 'remark']


class OrderDocumentCreateSerializer(serializers.ModelSerializer):
    """订单文档创建序列化器"""
    
    class Meta:
        model = OrderDocument
        fields = ['document_type', 'document_url', 'description']


class RatingCreateSerializer(serializers.ModelSerializer):
    """评价创建序列化器"""
    
    class Meta:
        model = Rating
        fields = ['to_user', 'rating', 'comment']
    
    def validate_rating(self, value):
        """验证评分"""
        if value < 1 or value > 5:
            raise serializers.ValidationError('评分必须在1-5之间')
        return value


class OrderListSerializer(serializers.ModelSerializer):
    """订单列表序列化器"""
    
    shipper_name = serializers.CharField(source='shipper.phone', read_only=True)
    driver_name = serializers.CharField(source='driver.phone', read_only=True)
    goods_title = serializers.CharField(source='goods.title', read_only=True)
    vehicle_license_plate = serializers.CharField(source='vehicle.license_plate', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'shipper_name', 'driver_name',
            'goods_title', 'vehicle_license_plate',
            'freight_fee', 'total_amount',
            'status', 'status_display', 'payment_status', 'payment_status_display',
            'expected_loading_time', 'expected_delivery_time',
            'created_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'shipper_name', 'driver_name',
            'goods_title', 'vehicle_license_plate',
            'status_display', 'payment_status_display', 'created_at'
        ]