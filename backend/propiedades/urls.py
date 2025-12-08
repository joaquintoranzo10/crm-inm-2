from rest_framework.routers import DefaultRouter
from .views import PropiedadViewSet,PropiedadImagenViewSet

router = DefaultRouter()
router.register(r"propiedades", PropiedadViewSet, basename="propiedad")
router.register(r"propiedad-imagenes", PropiedadImagenViewSet, basename="propiedad-imagen")

urlpatterns = router.urls