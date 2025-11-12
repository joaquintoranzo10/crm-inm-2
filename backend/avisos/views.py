# avisos/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q # Importamos Q

from .models import Aviso
from .serializers import AvisoSerializer

class AvisoViewSet(viewsets.ModelViewSet):
    
    # El queryset base que DRF usa para registrar la URL.
    queryset = Aviso.objects.all().order_by("-fecha")
    
    serializer_class = AvisoSerializer
    permission_classes = [IsAuthenticated] # Exigir autenticación

    def get_queryset(self):
        """
        Esta función sobreescribe el 'queryset' de arriba para los usuarios.
        Filtra para mostrar solo los avisos PENDIENTES del usuario logueado.
        """
        user = self.request.user
        
        # Empezamos con el queryset base
        qs = super().get_queryset() 

        # Filtramos por 'owner' (dueño)
        if not (user.is_staff or user.is_superuser):
            # Asumimos que filtramos por el 'owner' del Lead asociado
            # O avisos que no tienen lead (ej. globales)
            # NOTA: Si tu modelo Aviso tuviera un campo 'owner',
            # la línea sería simplemente: qs = qs.filter(owner=user)
            qs = qs.filter(Q(lead__owner=user) | Q(lead__isnull=True))

        # Filtramos solo los pendientes y ordenamos
        return qs.filter(estado="pendiente").order_by("-fecha")

    # --- NUEVA ACCIÓN ---
    # Esto crea la URL: /api/avisos/{id}/marcar-leido/
    @action(detail=True, methods=["post"], url_path="marcar-leido")
    def marcar_leido(self, request, pk=None):
        """
        Marca un aviso específico como 'completado'.
        """
        try:
            # get_object() usa get_queryset(), así que ya filtra por 'owner' y 'pendiente'
            aviso = self.get_object()
        except Aviso.DoesNotExist:
            # Si no lo encuentra, es porque no existe, no es nuestro, o ya está completado
            return Response({"detail": "No encontrado o ya completado."}, status=status.HTTP_404_NOT_FOUND)

        # Si lo encontramos (lo que significa que está 'pendiente')...
        aviso.estado = "completado"
        aviso.save(update_fields=["estado", "actualizado_en"])
        
        return Response(
            {"detail": "Aviso marcado como completado."},
            status=status.HTTP_200_OK
        )

    # (No necesitamos el OwnedQuerysetMixin si filtramos en get_queryset)
    # (No necesitamos perform_create si los signals se encargan de crear avisos)