
import logging
import secrets
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from .models import Usuario
from .email_utils import send_reset_password_email

logger = logging.getLogger(__name__)

# Tiempo de vida del token  (30 minutos)
RESET_TOKEN_TTL = 60 * 30
CACHE_PREFIX = "pwd_reset:"


class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset/request/
    Solicita el envío del correo de restablecimiento de contraseña.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()

        if not email:
            return Response(
                {"detail": "El email es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Respuesta genérica para no revelar si el email existe
        generic_response = Response(
            {"detail": "Si ese correo está registrado, recibirás un enlace para restablecer tu contraseña."},
            status=status.HTTP_200_OK,
        )

        # Buscar el auth.User (quien tiene la contraseña real de login)
        try:
            auth_user = User.objects.get(username=email)
        except User.DoesNotExist:
           
            logger.info(f"[PWD-RESET] Solicitud para email no registrado: {email}")
            return generic_response

        # Obtener nombre del usuario desde tabla usuarios_usuario
        nombre = auth_user.first_name or auth_user.username
        try:
            usuario_obj = Usuario.objects.get(email__iexact=email)
            nombre = usuario_obj.nombre or nombre
        except Usuario.DoesNotExist:
            pass

        # Generar token seguro y guardarlo en caché
        token = secrets.token_urlsafe(48)
        cache_key = f"{CACHE_PREFIX}{token}"
        cache.set(cache_key, {"user_id": auth_user.id, "email": email}, timeout=RESET_TOKEN_TTL)

        # Construir URL del frontend
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        reset_url = f"{frontend_url}/reset-password?token={token}"

        # Enviar el correo
        sent = send_reset_password_email(
            user_email=email,
            reset_url=reset_url,
            nombre=nombre,
        )

        if not sent:
            # Loguear el error pero no exponerlo al cliente
            logger.error(f"[PWD-RESET] Falló el envío a {email}")

        return generic_response


class PasswordResetConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Confirma el restablecimiento de contraseña con el token recibido por mail.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token = (request.data.get("token") or "").strip()
        new_password = request.data.get("new_password") or ""
        re_new_password = request.data.get("re_new_password") or ""

        # Validaciones básicas
        if not token:
            return Response({"detail": "El token es obligatorio."}, status=400)
        if not new_password or not re_new_password:
            return Response({"detail": "Debés completar ambos campos de contraseña."}, status=400)
        if new_password != re_new_password:
            return Response({"detail": "Las contraseñas no coinciden."}, status=400)
        if len(new_password) < 8:
            return Response({"detail": "La contraseña debe tener al menos 8 caracteres."}, status=400)

        # Buscar token en caché
        cache_key = f"{CACHE_PREFIX}{token}"
        cached = cache.get(cache_key)

        if not cached:
            return Response(
                {"detail": "El enlace es inválido o ya expiró. Solicitá uno nuevo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_id = cached.get("user_id")
        email = cached.get("email")

        # Obtener el auth.User y actualizar contraseña
        try:
            auth_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Usuario no encontrado."}, status=400)

        auth_user.set_password(new_password)
        auth_user.save(update_fields=["password"])

        # Sincronizar password_hash en tabla usuarios_usuario también
        try:
            usuario_obj = Usuario.objects.get(email__iexact=email)
            usuario_obj.password_hash = make_password(new_password)
            usuario_obj.save(update_fields=["password_hash"])
        except Usuario.DoesNotExist:
            pass

        # Invalidar el token (uso único)
        cache.delete(cache_key)

        logger.info(f"[PWD-RESET] Contraseña restablecida exitosamente para: {email}")

        return Response(
            {"detail": "Contraseña actualizada correctamente. Ya podés iniciar sesión."},
            status=status.HTTP_200_OK,
        )
