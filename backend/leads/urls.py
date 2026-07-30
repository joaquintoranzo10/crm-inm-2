from rest_framework.routers import DefaultRouter
from .views import EstadoLeadViewSet, ContactoViewSet, EventoViewSet,HistorialLeadViewSet

router = DefaultRouter()
router.register(r"estados-lead", EstadoLeadViewSet)
router.register(r"contactos", ContactoViewSet)
router.register(r"eventos", EventoViewSet)  
router.register(r'historial', HistorialLeadViewSet, basename='historial')

urlpatterns = router.urls
