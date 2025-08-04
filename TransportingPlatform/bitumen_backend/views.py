from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

class HealthCheckView(APIView):
    """健康检查视图"""
    
    permission_classes = [AllowAny]
    
    @extend_schema(
        description="健康检查接口",
        responses={
            200: {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "description": "服务状态"},
                    "version": {"type": "string", "description": "API版本"}
                }
            }
        }
    )
    def get(self, request):
        """健康检查"""
        return Response({
            'status': 'ok',
            'version': 'v1.0.0'
        })