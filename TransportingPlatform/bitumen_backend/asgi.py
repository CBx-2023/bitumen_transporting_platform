"""
ASGI config for bitumen_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

# 导入WebSocket消费者
from tracking_app.consumers import LocationConsumer
from notification_app.consumers import NotificationConsumer

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bitumen_backend.settings")

# 定义WebSocket路由
websocket_urlpatterns = [
    path('ws/tracking/<str:order_id>/', LocationConsumer.as_asgi()),
    path('ws/notifications/<str:user_id>/', NotificationConsumer.as_asgi()),
]

# 配置ASGI应用
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})