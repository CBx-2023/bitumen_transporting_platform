#!/usr/bin/env python
"""
API文档生成工具

此脚本帮助开发者为API视图添加Swagger文档注释
"""

import os
import re
import sys
import importlib
from inspect import getmembers, isclass

# 添加项目路径到系统路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bitumen_backend.settings')
import django
django.setup()

from django.conf import settings
from rest_framework import viewsets, generics, views

def get_app_views():
    """获取所有应用中的视图类"""
    view_classes = []
    
    for app_name in settings.INSTALLED_APPS:
        # 跳过Django内置应用和第三方应用
        if app_name.startswith('django.') or app_name in ['rest_framework', 'channels', 'corsheaders', 'drf_spectacular']:
            continue
            
        try:
            # 尝试导入视图模块
            views_module = importlib.import_module(f"{app_name}.views")
            
            # 查找所有视图类
            for name, obj in getmembers(views_module):
                if (isclass(obj) and 
                    (issubclass(obj, viewsets.ViewSet) or 
                     issubclass(obj, generics.GenericAPIView) or
                     issubclass(obj, views.APIView)) and
                    obj.__module__ == views_module.__name__):
                    view_classes.append((app_name, name, obj))
        except (ImportError, AttributeError):
            # 如果没有views模块或导入失败，跳过
            continue
    
    return view_classes

def print_view_info():
    """打印所有视图类的信息"""
    view_classes = get_app_views()
    
    print(f"\n找到 {len(view_classes)} 个API视图类:")
    print("-" * 80)
    
    for app_name, class_name, view_class in view_classes:
        print(f"应用: {app_name}")
        print(f"视图类: {class_name}")
        print(f"文档: {view_class.__doc__ or '无文档字符串'}")
        
        # 如果是ViewSet，打印所有action
        if hasattr(view_class, 'get_extra_actions'):
            actions = []
            try:
                # 创建一个实例来获取actions
                instance = view_class()
                for action in instance.get_extra_actions():
                    action_doc = action.__doc__.strip() if action.__doc__ else '无文档'
                    methods = ', '.join(action.mapping.keys())
                    actions.append(f"{methods} {action.url_path} - {action_doc}")
            except Exception as e:
                actions.append(f"无法获取actions: {str(e)}")
            
            if actions:
                print("Actions:")
                for action in actions:
                    print(f"  - {action}")
        
        print("-" * 80)

def main():
    """主函数"""
    print("\n沥青运输系统 - API文档生成工具")
    print("=" * 80)
    print("此工具帮助您检查API视图的文档状态")
    print("您可以访问以下URL查看API文档:")
    print("  - Swagger UI: http://127.0.0.1:8000/swagger/")
    print("  - ReDoc: http://127.0.0.1:8000/redoc/")
    print("=" * 80)
    
    print_view_info()
    
    print("\n提示:")
    print("1. 为视图类添加详细的文档字符串，描述API的功能和用途")
    print("2. 为每个action方法添加文档字符串，包含参数说明和响应格式")
    print("3. 使用drf_spectacular的@extend_schema装饰器添加更详细的API文档")
    print("4. 重启开发服务器后访问Swagger UI或ReDoc查看更新后的文档")
    
if __name__ == "__main__":
    main()