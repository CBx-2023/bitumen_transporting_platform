
from rest_framework import serializers
from .models import Goods, GoodsImage
from user_app.serializers import UserSerializer


class GoodsImageSerializer(serializers.ModelSerializer):
    """货源图片序列化器"""
    
    class Meta:
        model = GoodsImage
        fields = ['id', 'image_url', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class GoodsSerializer(serializers.ModelSerializer):
    """货源序列化器"""
    
    images = GoodsImageSerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Goods
        fields = [
            'id', 'user', 'title', 'description', 'weight', 'volume', 'goods_type',
            'from_location', 'from_longitude', 'from_latitude',
            'to_location', 'to_longitude', 'to_latitude',
            'loading_time', 'expected_arrival_time', 'expected_price',
            'status', 'status_display', 'images',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'status_display', 'created_at', 'updated_at']


class GoodsCreateSerializer(serializers.ModelSerializer):
    """货源创建序列化器"""
    
    images = serializers.ListField(
        child=serializers.URLField(),
        required=False,
        help_text='图片URL列表'
    )
    
    class Meta:
        model = Goods
        fields = [
            'title', 'description', 'weight', 'volume', 'goods_type',
            'from_location', 'from_longitude', 'from_latitude',
            'to_location', 'to_longitude', 'to_latitude',
            'loading_time', 'expected_arrival_time', 'expected_price',
            'images'
        ]
    
    def create(self, validated_data):
        images_data = validated_data.pop('images', [])
        goods = Goods.objects.create(**validated_data)
        
        # 创建货源图片
        for image_url in images_data:
            GoodsImage.objects.create(goods=goods, image_url=image_url)
        
        return goods


class GoodsUpdateSerializer(serializers.ModelSerializer):
    """货源更新序列化器"""
    
    class Meta:
        model = Goods
        fields = [
            'title', 'description', 'weight', 'volume', 'goods_type',
            'from_location', 'from_longitude', 'from_latitude',
            'to_location', 'to_longitude', 'to_latitude',
            'loading_time', 'expected_arrival_time', 'expected_price',
            'status'
        ]


class GoodsImageCreateSerializer(serializers.ModelSerializer):
    """货源图片创建序列化器"""
    
    class Meta:
        model = GoodsImage
        fields = ['image_url', 'description']


class GoodsListSerializer(serializers.ModelSerializer):
    """货源列表序列化器"""
    
    user_name = serializers.CharField(source='user.phone', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Goods
        fields = [
            'id', 'user_name', 'title', 'weight',
            'from_location', 'to_location',
            'loading_time', 'expected_price',
            'status', 'status_display',
            'created_at'
        ]
        read_only_fields = ['id', 'user_name', 'status_display', 'created_at']