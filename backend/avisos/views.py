from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q 
from django.utils import timezone
from .models import Aviso
from .serializers import AvisoSerializer

try:
    from usuarios.email_utils import send_aviso_email
    from usuarios.models import Usuario
    EMAIL_ENABLED = True
except ImportError:
    EMAIL_ENABLED = False

class OwnedQuerysetMixin:
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return qs
        return qs.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

def _enviar_notificacion_aviso(aviso: Aviso, auth_user) -> None:
    if not EMAIL_ENABLED:
        return

    try:
        email = getattr(auth_user, "email", None) or getattr(auth_user, "username", None)
        if not email:
            return

        nombre = auth_user.first_name or "Usuario"
        try:
            usuario_obj = Usuario.objects.get(email__iexact=email)
            nombre = usuario_obj.nombre or nombre
        except Usuario.DoesNotExist:
            pass

        fecha_str = ""
        if aviso.fecha:
            fecha_local = timezone.localtime(aviso.fecha)
            fecha_str = fecha_local.strftime("%d/%m/%Y %H:%M")

        lead_nombre = ""
        if aviso.lead:
            lead_nombre = str(aviso.lead)

        send_aviso_email(
            user_email=email,
            nombre=nombre,
            aviso_data={
                "titulo": aviso.titulo,
                "descripcion": aviso.descripcion or "",
                "fecha": fecha_str,
                "lead_nombre": lead_nombre,
            },
        )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error(
            f"[AVISOS] Error al enviar notificación de aviso #{aviso.pk}: {exc}",
            exc_info=True,
        )

class AvisoViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Aviso.objects.all().order_by("-fecha") 
    serializer_class = AvisoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        
        _enviar_notificacion_aviso(serializer.instance, self.request.user)

    @action(detail=True, methods=["post"], url_path="marcar-leido")
    def marcar_leido(self, request, pk=None):
        try:
            aviso = self.get_object()
        except Aviso.DoesNotExist:
            return Response({"detail": "No encontrado o ya completado."}, status=status.HTTP_404_NOT_FOUND)

        aviso.estado = "completado"
        aviso.save(update_fields=["estado", "actualizado_en"])
        
        return Response(
            {"detail": "Aviso marcado como completado."},
            status=status.HTTP_200_OK
        )