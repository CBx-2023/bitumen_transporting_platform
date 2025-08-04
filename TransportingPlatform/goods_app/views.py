
import logging
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework import status, viewsets, mixins, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend

from .models import Goods, GoodsImage
from .serializers import (
    GoodsSerializer, GoodsCreateSerializer, GoodsUpdateSerializer,
    GoodsImageSerializer, GoodsImageCreateSerializer, GoodsListSerializer
)

logger = logging.getLogger(__name__)


class GoodsViewSet(viewsets.ModelViewSet):
    """货源视图集"""
    
    queryset = Goods.objects.all()
    serializer_class = GoodsSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'goods_type']
    search_fields = ['title', 'description', 'from_location', 'to_location']
    ordering_fields = ['created_at', 'loading_time', 'expected_price', 'weight']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """根据操作选择序列化器"""
        if self.action == 'create':
            return GoodsCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return GoodsUpdateSerializer
        elif self.action == 'list':
            return GoodsListSerializer
        elif self.action == 'add_image':
            return GoodsImageCreateSerializer
        return self.serializer_class
    
    def get_permissions(self):
        """根据操作选择权限"""
        if self.action == 'list' or self.action == 'retrieve':
            return [AllowAny()]
        return super().get_permissions()
    
    def get_queryset(self):
        """获取查询集"""
        queryset = super().get_queryset()
        
        # 如果是获取我的货源列表，则只返回当前用户的货源
        if self.action == 'my_goods':
            return queryset.filter(user=self.request.user)
        
        # 如果是搜索附近的货源，则根据经纬度进行筛选
        if self.action == 'nearby':
            longitude = self.request.query_params.get('longitude')
            latitude = self.request.query_params.get('latitude')
            distance = self.request.query_params.get('distance', 50)  # 默认50公里
            
            if longitude and latitude:
                # 这里简化处理，实际项目中应该使用地理位置查询
                # 例如使用Django的GeoDjango或者自定义SQL查询
                # 这里仅作为示例，返回所有货源
                return queryset
        
        # 默认只返回待接单状态的货源
        if self.action == 'list' and not self.request.query_params.get('status'):
            return queryset.filter(status=Goods.Status.PENDING)
        
        return queryset
    
    def perform_create(self, serializer):
        """创建货源时设置用户"""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_goods(self, request):
        """获取我的货源列表"""
        queryset = self.get_queryset()
        
        # 根据状态筛选
        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """获取附近的货源"""
        queryset = self.get_queryset()
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_image(self, request, pk=None):
        """添加货源图片"""
        goods = self.get_object()
        
        # 检查是否是货源的所有者
        if goods.user != request.user:
            return Response(
                {'error': '只有货源的所有者才能添加图片'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 创建货源图片
        image = GoodsImage.objects.create(
            goods=goods,
            image_url=serializer.validated_data.get('image_url'),
            description=serializer.validated_data.get('description')
        )
        
        return Response(
            GoodsImageSerializer(image).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['delete'])
    def remove_image(self, request, pk=None):
        """删除货源图片"""
        goods = self.get_object()
        
        # 检查是否是货源的所有者
        if goods.user != request.user:
            return Response(
                {'error': '只有货源的所有者才能删除图片'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        image_id = request.query_params.get('image_id')
        if not image_id:
            return Response(
                {'error': '缺少图片ID参数'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            image = GoodsImage.objects.get(id=image_id, goods=goods)
            image.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except GoodsImage.DoesNotExist:
            return Response(
                {'error': '图片不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """取消货源"""
        goods = self.get_object()
        
        # 检查是否是货源的所有者
        if goods.user != request.user:
            return Response(
                {'error': '只有货源的所有者才能取消货源'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 检查货源状态是否允许取消
        if goods.status != Goods.Status.PENDING:
            return Response(
                {'error': '只有待接单状态的货源才能取消'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 更新货源状态
        goods.status = Goods.Status.CANCELLED
        goods.save()
        
        return Response({'message': '货源已取消'})