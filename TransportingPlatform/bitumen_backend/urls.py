"""
URL configuration for bitumen_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from .views import HealthCheckView

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # API文档
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # 健康检查
    path('health/', HealthCheckView.as_view(), name='health-check'),
    
    # API路由
    path('api/auth/', include('auth_app.urls')),
    path('api/users/', include('user_app.urls')),
    path('api/goods/', include('goods_app.urls')),
    path('api/vehicles/', include('vehicle_app.urls')),
    path('api/orders/', include('order_app.urls')),
    path('api/tracking/', include('tracking_app.urls')),
    path('api/payments/', include('payment_app.urls')),
    path('api/notifications/', include('notification_app.urls')),
]

# 添加媒体文件URL
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)