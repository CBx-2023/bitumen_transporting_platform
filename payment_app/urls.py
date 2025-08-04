
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, WalletViewSet, WalletTransactionViewSet

app_name = 'payment_app'

router = DefaultRouter()
router.register(r'payments', PaymentViewSet)
router.register(r'wallets', WalletViewSet)
router.register(r'transactions', WalletTransactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]