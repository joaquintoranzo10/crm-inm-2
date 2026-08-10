from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from avisos.views import AvisoViewSet
from leads.views import EstadoLeadViewSet, ContactoViewSet, EventoViewSet
from propiedades.views import PropiedadViewSet,PropiedadImagenViewSet
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
# Usuarios
from usuarios.views import (
    ListaYCreaUsuario, DetalleUsuario,
    RegisterView, MeUsuarioView,
    ChangePasswordView, DeleteAccountView,
)
from django.core.management import call_command
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    return Response({"status": "ok"})



def disparar_recordatorios_view(request):
  
    token = request.GET.get('token')
    if token != 'realconnect2405':  
        return JsonResponse({'error': 'No autorizado'}, status=401)
    
    try:
        
        call_command('enviar_recordatorios')
        return JsonResponse({'status': 'ok', 'mensaje': 'Recordatorios procesados correctamente'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def health_check(request):
    return JsonResponse({"status": "ok", "mensaje": "¡El servidor está vivo!"})

router = DefaultRouter()
router.register(r"estados-lead", EstadoLeadViewSet)
router.register(r"contactos", ContactoViewSet)
router.register(r"eventos", EventoViewSet)
router.register(r"propiedades", PropiedadViewSet)
router.register(r"propiedad-imagenes", PropiedadImagenViewSet, basename="propiedad-imagen")
router.register(r"avisos", AvisoViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/", include(router.urls)),

<<<<<<< HEAD
    
    
    path('api/', include('propiedades.urls')),

    # Usuarios CRUD + perfil
=======
>>>>>>> ad36e0621bda88f406e1fcc56e47b5c3a8f00822
    path("api/usuarios/", ListaYCreaUsuario.as_view(), name="usuarios-lista"),
    path("api/usuarios/<int:pk>/", DetalleUsuario.as_view(), name="usuario-detalle"),
    path("api/usuarios/me/", MeUsuarioView.as_view(), name="usuarios-me"),
    path("api/usuarios/me/change_password/", ChangePasswordView.as_view(), name="usuarios-change-password"),
    path("api/usuarios/me/delete/", DeleteAccountView.as_view(), name="usuarios-delete-account"),

    
    path("api/auth/register/", RegisterView.as_view(), name="auth-register"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    
    path("api/health", health, name="api-health"),
    
    
    path("api/", include("dashboard.urls")),

    #para que uptime lo encuentre y de ok en el servidor
    path('api/health/', health_check),
    path('api/cron/enviar-recordatorios/', disparar_recordatorios_view),
]

#reseteo de contraseña
try:
    from usuarios.password_reset_views import PasswordResetRequestView, PasswordResetConfirmView
    urlpatterns += [
        path("api/auth/password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
        path("api/auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    ]
except Exception:
    pass


try:
    urlpatterns += [path("api/exportacion/", include("exportacion.urls"))]
except Exception:
    pass



if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)