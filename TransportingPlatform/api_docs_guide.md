# API文档指南

## 简介

本项目使用 drf_spectacular 为 Django REST framework API 生成 Swagger/OpenAPI 文档。这个指南将帮助您为 API 添加详细的文档。

## 访问API文档

API文档已经配置完成，您可以通过以下URL访问：

- Swagger UI: http://127.0.0.1:8000/swagger/
- ReDoc: http://127.0.0.1:8000/redoc/

## 为API添加文档的方法

### 1. 基本文档字符串

最简单的方法是为视图类和方法添加详细的文档字符串：

```python
class UserViewSet(viewsets.ModelViewSet):
    """
    用户管理API
    
    提供用户信息的查询、创建、更新和删除功能
    """
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        激活用户账户
        
        需要管理员权限
        """
        # 实现代码
```

### 2. 使用 @extend_schema 装饰器

对于更详细的API文档，可以使用 `@extend_schema` 装饰器：

```python
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

class UserViewSet(viewsets.ModelViewSet):
    
    @extend_schema(
        description="修改用户密码",
        request={
            'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['old_password', 'new_password'],
                    'properties': {
                        'old_password': {'type': 'string', 'description': '当前密码'},
                        'new_password': {'type': 'string', 'description': '新密码'},
                    }
                }
            }
        },
        responses={
            200: {
                'description': '密码修改成功',
                'content': {'application/json': {'schema': {'type': 'object'}}}
            },
            400: {'description': '请求数据无效'},
            401: {'description': '旧密码验证失败'},
        }
    )
    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        # 实现代码
```

### 3. 使用序列化器

如果您的视图使用序列化器，drf-yasg 会自动从序列化器中提取字段信息：

```python
class UserSerializer(serializers.ModelSerializer):
    """用户序列化器"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active']
        read_only_fields = ['id', 'is_active']
        extra_kwargs = {
            'username': {'help_text': '用户名，必须唯一'},
            'email': {'help_text': '电子邮箱地址'},
        }
```

### 4. 为序列化器字段添加帮助文本

```python
class OrderSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(
        choices=Order.STATUS_CHOICES,
        help_text="订单状态: 1-待支付, 2-已支付, 3-已发货, 4-已完成, 5-已取消"
    )
    
    class Meta:
        model = Order
        fields = '__all__'
```

## 最佳实践

1. **为每个视图类添加详细描述**：说明API的用途、权限要求等
2. **为每个方法添加文档**：描述功能、参数、响应格式等
3. **使用序列化器的help_text**：为字段添加说明
4. **分组API**：使用tags参数将相关API分组
5. **添加示例值**：使用example参数提供示例数据
6. **描述错误响应**：使用responses参数说明可能的错误情况

## 示例代码

```python
@extend_schema(
    summary="创建订单",
    description="创建新的运输订单",
    request=OrderCreateSerializer,
    responses={
        201: OrderSerializer,
        400: {"description": "请求数据无效"},
        403: {"description": "权限不足"}
    },
    tags=["订单管理"]
)
def create(self, request, *args, **kwargs):
    return super().create(request, *args, **kwargs)
```

## 工具脚本

项目根目录下的 `generate_api_docs.py` 脚本可以帮助您检查所有API视图的文档状态：

```bash
python generate_api_docs.py
```

## 更多资源

- [drf_spectacular 官方文档](https://drf-spectacular.readthedocs.io/)
- [OpenAPI 规范](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)