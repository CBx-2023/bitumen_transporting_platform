
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GoodsViewSet

app_name = 'goods_app'

router = DefaultRouter()
router.register(r'', GoodsViewSet)

urlpatterns = [
    path('', include(router.urls)),
]