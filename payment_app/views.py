
import logging
import uuid
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum

from rest_framework import status, viewsets, mixins, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend

from .models import Payment, PaymentLog, Wallet, WalletTransaction
from .serializers import (
    PaymentSerializer, PaymentCreateSerializer, PaymentUpdateSerializer,
    PaymentLogSerializer, WalletSerializer, WalletTransactionSerializer,
    WalletDepositSerializer, WalletWithdrawSerializer, PaymentListSerializer
)
from order_app.models import Order
from user_app.models import User

logger = logging.getLogger(__name__)


class PaymentViewSet(viewsets.ModelViewSet):
    """支付视图集"""
    
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_type', 'payment_method']
    ordering_fields = ['created_at', 'paid_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """根据操作选择序列化器"""
        if self.action == 'create':
            return PaymentCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return PaymentUpdateSerializer
        elif self.action == 'list' or self.action == 'my_payments':
            return PaymentListSerializer
        return self.serializer_class
    
    def get_queryset(self):
        """获取查询集"""
        queryset = super().get_queryset()
        
        # 如果是获取我的支付，则根据用户角色返回相应的支付
        if self.action == 'my_payments':
            user = self.request.user
            role = self.request.query_params.get('role')
            
            if role == 'payer':
                return queryset.filter(payer=user)
            elif role == 'payee':
                return queryset.filter(payee=user)
            else:
                # 默认返回用户作为付款人或收款人的所有支付
                return queryset.filter(Q(payer=user) | Q(payee=user))
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """创建支付"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 获取订单
        order_id = serializer.validated_data.get('order').id
        order = get_object_or_404(Order, id=order_id)
        
        # 检查当前用户是否是订单的货主或车主
        user = request.user
        if user != order.shipper and user != order.driver:
            return Response(
                {'error': '只有订单的货主或车主才能创建支付'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 确定付款人和收款人
        payer = user
        payee = serializer.validated_data.get('payee')
        
        # 检查收款人是否是订单的另一方
        if payee != order.shipper and payee != order.driver:
            return Response(
                {'error': '收款人必须是订单的货主或车主'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 生成支付编号
        payment_number = f"PAY{timezone.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
        
        with transaction.atomic():
            # 创建支付
            payment = Payment.objects.create(
                order=order,
                payment_number=payment_number,
                payer=payer,
                payee=payee,
                amount=serializer.validated_data.get('amount'),
                payment_type=serializer.validated_data.get('payment_type'),
                payment_method=serializer.validated_data.get('payment_method'),
                status=Payment.Status.PENDING,
                remark=serializer.validated_data.get('remark', '')
            )
            
            # 创建支付日志
            PaymentLog.objects.create(
                payment=payment,
                log_type=PaymentLog.Type.CREATE,
                content=f"创建支付 {payment_number}",
                data={
                    'payer': payer.id,
                    'payee': payee.id,
                    'amount': str(payment.amount),
                    'payment_type': payment.payment_type,
                    'payment_method': payment.payment_method
                }
            )
            
            # TODO: 调用支付接口，生成支付链接或二维码
            
            # TODO: 发送通知给相关用户
        
        return Response(
            PaymentSerializer(payment).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def notify(self, request, pk=None):
        """支付通知回调"""
        payment = self.get_object()
        
        # 这里简化处理，实际项目中应该验证支付通知的真实性
        # 例如验证签名、IP地址等
        
        # 获取通知数据
        transaction_id = request.data.get('transaction_id')
        status_code = request.data.get('status')
        
        if not transaction_id or not status_code:
            return Response(
                {'error': '缺少必要参数'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # 记录支付日志
            PaymentLog.objects.create(
                payment=payment,
                log_type=PaymentLog.Type.NOTIFY,
                content=f"收到支付通知，交易ID: {transaction_id}, 状态: {status_code}",
                data=request.data
            )
            
            # 更新支付状态
            if status_code == 'SUCCESS':
                payment.status = Payment.Status.SUCCESS
                payment.transaction_id = transaction_id
                payment.transaction_data = request.data
                payment.paid_at = timezone.now()
                payment.save()
                
                # 更新订单支付状态
                order = payment.order
                
                # 如果是定金支付
                if payment.payment_type == Payment.Type.DEPOSIT:
                    order.payment_status = Order.PaymentStatus.PARTIAL_PAID
                    if order.status == Order.Status.PENDING_PAYMENT:
                        order.status = Order.Status.PENDING_LOADING
                # 如果是尾款或全款支付
                elif payment.payment_type in [Payment.Type.BALANCE, Payment.Type.FULL]:
                    order.payment_status = Order.PaymentStatus.PAID
                
                order.save()
                
                # TODO: 发送通知给相关用户
            elif status_code == 'FAIL':
                payment.status = Payment.Status.FAILED
                payment.transaction_id = transaction_id
                payment.transaction_data = request.data
                payment.save()
                
                # TODO: 发送通知给相关用户
        
        return Response({'message': '通知处理成功'})
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """取消支付"""
        payment = self.get_object()
        
        # 检查当前用户是否是支付的付款人
        if payment.payer != request.user:
            return Response(
                {'error': '只有付款人才能取消支付'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 检查支付状态是否允许取消
        if payment.status != Payment.Status.PENDING:
            return Response(
                {'error': '只有待支付状态的支付才能取消'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # 更新支付状态
            payment.status = Payment.Status.CANCELLED
            payment.save()
            
            # 创建支付日志
            PaymentLog.objects.create(
                payment=payment,
                log_type=PaymentLog.Type.UPDATE,
                content=f"取消支付 {payment.payment_number}",
                data={'status': Payment.Status.CANCELLED}
            )
            
            # TODO: 发送通知给相关用户
        
        return Response({'message': '支付已取消'})
    
    @action(detail=False, methods=['get'])
    def my_payments(self, request):
        """获取我的支付列表"""
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


class WalletViewSet(viewsets.GenericViewSet,
                   mixins.RetrieveModelMixin,
                   mixins.ListModelMixin):
    """钱包视图集"""
    
    queryset = Wallet.objects.all()
    serializer_class = WalletSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """获取查询集"""
        # 只返回当前用户的钱包
        return self.queryset.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_wallet(self, request):
        """获取我的钱包"""
        # 获取或创建钱包
        wallet, created = Wallet.objects.get_or_create(
            user=request.user,
            defaults={'balance': 0, 'frozen_amount': 0}
        )
        
        serializer = self.get_serializer(wallet)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def deposit(self, request):
        """充值"""
        serializer = WalletDepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        amount = serializer.validated_data.get('amount')
        payment_method = serializer.validated_data.get('payment_method')
        
        # 获取或创建钱包
        wallet, created = Wallet.objects.get_or_create(
            user=request.user,
            defaults={'balance': 0, 'frozen_amount': 0}
        )
        
        # 生成交易编号
        transaction_number = f"DEP{timezone.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
        
        with transaction.atomic():
            # 创建钱包交易记录
            wallet_transaction = WalletTransaction.objects.create(
                wallet=wallet,
                transaction_number=transaction_number,
                amount=amount,
                balance_before=wallet.balance,
                balance_after=wallet.balance + amount,
                transaction_type=WalletTransaction.Type.DEPOSIT,
                status=WalletTransaction.Status.PENDING,
                remark='充值'
            )
            
            # TODO: 调用支付接口，生成充值链接或二维码
            
            # TODO: 发送通知给用户
        
        return Response(
            WalletTransactionSerializer(wallet_transaction).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['post'])
    def withdraw(self, request):
        """提现"""
        serializer = WalletWithdrawSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        amount = serializer.validated_data.get('amount')
        
        # 获取钱包
        try:
            wallet = Wallet.objects.get(user=request.user)
        except Wallet.DoesNotExist:
            return Response(
                {'error': '钱包不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 检查余额
        if wallet.balance - wallet.frozen_amount < amount:
            return Response(
                {'error': '可用余额不足'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 生成交易编号
        transaction_number = f"WDR{timezone.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
        
        with transaction.atomic():
            # 冻结金额
            wallet.frozen_amount += amount
            wallet.save()
            
            # 创建钱包交易记录
            wallet_transaction = WalletTransaction.objects.create(
                wallet=wallet,
                transaction_number=transaction_number,
                amount=amount,
                balance_before=wallet.balance,
                balance_after=wallet.balance - amount,  # 提现成功后的余额
                transaction_type=WalletTransaction.Type.WITHDRAW,
                status=WalletTransaction.Status.PENDING,
                remark='提现'
            )
            
            # TODO: 调用提现接口，处理提现请求
            
            # TODO: 发送通知给用户
        
        return Response(
            WalletTransactionSerializer(wallet_transaction).data,
            status=status.HTTP_201_CREATED
        )


class WalletTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """钱包交易记录视图集"""
    
    queryset = WalletTransaction.objects.all()
    serializer_class = WalletTransactionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['transaction_type', 'status']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """获取查询集"""
        # 只返回当前用户的钱包交易记录
        return self.queryset.filter(wallet__user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """获取交易统计信息"""
        queryset = self.get_queryset()
        
        # 统计各类型交易金额
        deposit_amount = queryset.filter(
            transaction_type=WalletTransaction.Type.DEPOSIT,
            status=WalletTransaction.Status.SUCCESS
        )