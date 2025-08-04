
import logging
import uuid
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Q

from rest_framework import status, viewsets, mixins, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend

from .models import Order, OrderStatusLog, OrderDocument, Rating
from .serializers import (
    OrderSerializer, OrderCreateSerializer, OrderUpdateSerializer,
    OrderStatusUpdateSerializer, OrderDocumentCreateSerializer,
    RatingCreateSerializer, OrderListSerializer
)
from goods_app.models import Goods
from vehicle_app.models import Vehicle
from user_app.models import User

logger = logging.getLogger(__name__)


class OrderViewSet(viewsets.ModelViewSet):
    """订单视图集"""
    
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_status']
    search_fields = ['order_number', 'shipper__phone', 'driver__phone']
    ordering_fields = ['created_at', 'expected_loading_time', 'expected_delivery_time']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """根据操作选择序列化器"""
        if self.action == 'create':
            return OrderCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return OrderUpdateSerializer
        elif self.action == 'list' or self.action == 'my_orders':
            return OrderListSerializer
        elif self.action == 'update_status':
            return OrderStatusUpdateSerializer
        elif self.action == 'add_document':
            return OrderDocumentCreateSerializer
        elif self.action == 'rate':
            return RatingCreateSerializer
        return self.serializer_class
    
    def get_queryset(self):
        """获取查询集"""
        queryset = super().get_queryset()
        
        # 如果是获取我的订单列表，则根据用户角色返回相应的订单
        if self.action == 'my_orders':
            user = self.request.user
            role = self.request.query_params.get('role')
            
            if role == 'shipper':
                return queryset.filter(shipper=user)
            elif role == 'driver':
                return queryset.filter(driver=user)
            else:
                # 默认返回用户作为货主或车主的所有订单
                return queryset.filter(Q(shipper=user) | Q(driver=user))
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """创建订单"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 获取货源和车辆
        goods_id = serializer.validated_data.get('goods').id
        vehicle_id = serializer.validated_data.get('vehicle').id
        
        goods = get_object_or_404(Goods, id=goods_id)
        vehicle = get_object_or_404(Vehicle, id=vehicle_id)
        
        # 检查当前用户是否是货主或车主
        user = request.user
        if user != goods.user and user != vehicle.user:
            return Response(
                {'error': '只有货主或车主才能创建订单'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 确定货主和车主
        shipper = goods.user
        driver = vehicle.user
        
        # 生成订单编号
        order_number = f"ORD{timezone.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
        
        with transaction.atomic():
            # 创建订单
            order = Order.objects.create(
                order_number=order_number,
                goods=goods,
                vehicle=vehicle,
                shipper=shipper,
                driver=driver,
                freight_fee=serializer.validated_data.get('freight_fee'),
                deposit=serializer.validated_data.get('deposit', 0),
                other_fees=serializer.validated_data.get('other_fees', 0),
                total_amount=serializer.validated_data.get('freight_fee') + serializer.validated_data.get('other_fees', 0),
                status=Order.Status.PENDING_PAYMENT if serializer.validated_data.get('deposit', 0) > 0 else Order.Status.PENDING_LOADING,
                payment_status=Order.PaymentStatus.UNPAID,
                expected_loading_time=serializer.validated_data.get('expected_loading_time'),
                expected_delivery_time=serializer.validated_data.get('expected_delivery_time'),
                shipper_notes=serializer.validated_data.get('shipper_notes', ''),
                driver_notes=serializer.validated_data.get('driver_notes', '')
            )
            
            # 创建订单状态日志
            OrderStatusLog.objects.create(
                order=order,
                from_status='',
                to_status=order.status,
                operator=user,
                remark='创建订单'
            )
            
            # 更新货源状态
            goods.status = Goods.Status.ACCEPTED
            goods.save()
            
            # 更新车辆状态
            vehicle.status = Vehicle.Status.IN_TRANSIT
            vehicle.save()
            
            # TODO: 发送通知给货主和车主
            
        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """更新订单"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # 检查当前用户是否是货主或车主
        user = request.user
        if user != instance.shipper and user != instance.driver:
            return Response(
                {'error': '只有货主或车主才能更新订单'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # 如果更新了状态，记录状态变更日志
        if 'status' in serializer.validated_data and serializer.validated_data['status'] != instance.status:
            old_status = instance.status
            new_status = serializer.validated_data['status']
            
            # 创建订单状态日志
            OrderStatusLog.objects.create(
                order=instance,
                from_status=old_status,
                to_status=new_status,
                operator=user,
                remark=request.data.get('remark', '状态更新')
            )
            
            # TODO: 发送通知给相关用户
        
        self.perform_update(serializer)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_orders(self, request):
        """获取我的订单列表"""
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
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """更新订单状态"""
        order = self.get_object()
        
        # 检查当前用户是否是货主或车主
        user = request.user
        if user != order.shipper and user != order.driver:
            return Response(
                {'error': '只有货主或车主才能更新订单状态'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        new_status = serializer.validated_data['status']
        remark = serializer.validated_data.get('remark', '')
        
        # 检查状态变更是否合法
        if not self._is_valid_status_transition(order.status, new_status, user == order.shipper):
            return Response(
                {'error': '非法的状态变更'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # 记录旧状态
            old_status = order.status
            
            # 更新订单状态
            order.status = new_status
            
            # 根据状态更新相关字段
            if new_status == Order.Status.IN_TRANSIT:
                order.actual_loading_time = timezone.now()
            elif new_status == Order.Status.DELIVERED:
                order.actual_delivery_time = timezone.now()
            
            order.save()
            
            # 创建订单状态日志
            OrderStatusLog.objects.create(
                order=order,
                from_status=old_status,
                to_status=new_status,
                operator=user,
                remark=remark
            )
            
            # 如果订单完成或取消，更新货源和车辆状态
            if new_status in [Order.Status.COMPLETED, Order.Status.CANCELLED]:
                # 更新货源状态
                if new_status == Order.Status.COMPLETED:
                    order.goods.status = Goods.Status.COMPLETED
                else:
                    order.goods.status = Goods.Status.CANCELLED
                order.goods.save()
                
                # 更新车辆状态
                order.vehicle.status = Vehicle.Status.AVAILABLE
                order.vehicle.save()
            
            # TODO: 发送通知给相关用户
        
        return Response(OrderSerializer(order).data)
    
    @action(detail=True, methods=['post'])
    def add_document(self, request, pk=None):
        """添加订单文档"""
        order = self.get_object()
        
        # 检查当前用户是否是货主或车主
        user = request.user
        if user != order.shipper and user != order.driver:
            return Response(
                {'error': '只有货主或车主才能添加订单文档'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 创建订单文档
        document = OrderDocument.objects.create(
            order=order,
            document_type=serializer.validated_data['document_type'],
            document_url=serializer.validated_data['document_url'],
            description=serializer.validated_data.get('description', '')
        )
        
        from .serializers import OrderDocumentSerializer
        return Response(
            OrderDocumentSerializer(document).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        """评价订单"""
        order = self.get_object()
        
        # 检查当前用户是否是货主或车主
        user = request.user
        if user != order.shipper and user != order.driver:
            return Response(
                {'error': '只有货主或车主才能评价订单'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 检查订单是否已完成
        if order.status != Order.Status.COMPLETED:
            return Response(
                {'error': '只有已完成的订单才能评价'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        to_user_id = serializer.validated_data['to_user'].id
        
        # 检查评价对象是否是订单的另一方
        if user == order.shipper and to_user_id != order.driver.id:
            return Response(
                {'error': '货主只能评价车主'},
                status=status.HTTP_400_BAD_REQUEST
            )
        elif user == order.driver and to_user_id != order.shipper.id:
            return Response(
                {'error': '车主只能评价货主'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 检查是否已经评价过
        if Rating.objects.filter(order=order, from_user=user).exists():
            return Response(
                {'error': '您已经评价过该订单'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 创建评价
        rating = Rating.objects.create(
            order=order,
            from_user=user,
            to_user_id=to_user_id,
            rating=serializer.validated_data['rating'],
            comment=serializer.validated_data.get('comment', '')
        )
        
        # 更新被评价用户的信用评分
        to_user = User.objects.get(id=to_user_id)
        ratings = Rating.objects.filter(to_user=to_user)
        avg_rating = ratings.aggregate(models.Avg('rating'))['rating__avg']
        to_user.credit_score = avg_rating
        to_user.save()
        
        from .serializers import RatingSerializer
        return Response(
            RatingSerializer(rating).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """取消订单"""
        order = self.get_object()
        
        # 检查当前用户是否是货主或车主
        user = request.user
        if user != order.shipper and user != order.driver:
            return Response(
                {'error': '只有货主或车主才能取消订单'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 检查订单状态是否允许取消
        if order.status not in [Order.Status.PENDING_PAYMENT, Order.Status.PENDING_LOADING]:
            return Response(
                {'error': '只有待支付或待装货状态的订单才能取消'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # 记录旧状态
            old_status = order.status
            
            # 更新订单状态
            order.status = Order.Status.CANCELLED
            order.save()