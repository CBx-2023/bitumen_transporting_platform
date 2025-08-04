
import decimal
from rest_framework import serializers
from .models import Payment, PaymentLog, Wallet, WalletTransaction
from user_app.serializers import UserSerializer
from order_app.serializers import OrderListSerializer


class PaymentSerializer(serializers.ModelSerializer):
    """支付序列化器"""
    
    order = OrderListSerializer(read_only=True)
    payer = UserSerializer(read_only=True)
    payee = UserSerializer(read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'payment_number', 'payer', 'payee',
            'amount', 'payment_type', 'payment_type_display',
            'payment_method', 'payment_method_display',
            'status', 'status_display', 'transaction_id',
            'transaction_data', 'remark', 'created_at', 'paid_at'
        ]
        read_only_fields = [
            'id', 'payment_number', 'payment_type_display',
            'payment_method_display', 'status_display',
            'created_at', 'paid_at'
        ]


class PaymentCreateSerializer(serializers.ModelSerializer):
    """支付创建序列化器"""
    
    class Meta:
        model = Payment
        fields = [
            'order', 'payee', 'amount', 'payment_type',
            'payment_method', 'remark'
        ]


class PaymentUpdateSerializer(serializers.ModelSerializer):
    """支付更新序列化器"""
    
    class Meta:
        model = Payment
        fields = [
            'status', 'transaction_id', 'transaction_data',
            'remark', 'paid_at'
        ]


class PaymentLogSerializer(serializers.ModelSerializer):
    """支付日志序列化器"""
    
    payment = PaymentSerializer(read_only=True)
    log_type_display = serializers.CharField(source='get_log_type_display', read_only=True)
    
    class Meta:
        model = PaymentLog
        fields = [
            'id', 'payment', 'log_type', 'log_type_display',
            'content', 'data', 'created_at'
        ]
        read_only_fields = [
            'id', 'log_type_display', 'created_at'
        ]


class WalletSerializer(serializers.ModelSerializer):
    """钱包序列化器"""
    
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Wallet
        fields = [
            'id', 'user', 'balance', 'frozen_amount',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'balance', 'frozen_amount',
            'created_at', 'updated_at'
        ]


class WalletTransactionSerializer(serializers.ModelSerializer):
    """钱包交易记录序列化器"""
    
    wallet = WalletSerializer(read_only=True)
    related_order = OrderListSerializer(read_only=True)
    related_payment = PaymentSerializer(read_only=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = WalletTransaction
        fields = [
            'id', 'wallet', 'transaction_number', 'amount',
            'balance_before', 'balance_after',
            'transaction_type', 'transaction_type_display',
            'status', 'status_display', 'related_order',
            'related_payment', 'remark', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'transaction_number', 'transaction_type_display',
            'status_display', 'created_at', 'updated_at'
        ]


class WalletDepositSerializer(serializers.Serializer):
    """钱包充值序列化器"""
    
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=decimal.Decimal('0.01'))
    payment_method = serializers.ChoiceField(choices=Payment.Method.choices)
    
    class Meta:
        fields = ['amount', 'payment_method']


class WalletWithdrawSerializer(serializers.Serializer):
    """钱包提现序列化器"""
    
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=decimal.Decimal('0.01'))
    
    class Meta:
        fields = ['amount']
    
    def validate_amount(self, value):
        """验证提现金额"""
        user = self.context['request'].user
        try:
            wallet = Wallet.objects.get(user=user)
            if value > wallet.balance - wallet.frozen_amount:
                raise serializers.ValidationError('提现金额不能大于可用余额')
        except Wallet.DoesNotExist:
            raise serializers.ValidationError('钱包不存在')
        return value


class PaymentListSerializer(serializers.ModelSerializer):
    """支付列表序列化器"""
    
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    payer_name = serializers.CharField(source='payer.phone', read_only=True)
    payee_name = serializers.CharField(source='payee.phone', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'order_number',
            'payer_name', 'payee_name', 'amount',
            'payment_type', 'payment_type_display',
            'payment_method', 'payment_method_display',
            'status', 'status_display', 'created_at', 'paid_at'
        ]
        read_only_fields = [
            'id', 'payment_number', 'order_number',
            'payer_name', 'payee_name',
            'payment_type_display', 'payment_method_display',
            'status_display', 'created_at', 'paid_at'
        ]