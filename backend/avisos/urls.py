# avisos/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AvisoViewSet

router = DefaultRouter()
# Esto registra '/api/avisos/' y también la acción '/api/avisos/<pk>/marcar-leido/'
router.register(r'avisos', AvisoViewSet, basename='aviso')

urlpatterns = [
    path('', include(router.urls)),
]