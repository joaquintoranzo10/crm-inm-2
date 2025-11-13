# propiedades/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from .models import Propiedad, PropiedadImagen
from .serializers import (
    PropiedadSerializer,
    SubirImagenesSerializer,
    PropiedadImagenSerializer,
)


# ---------- Mixin multi-tenant ----------
class OwnedQuerysetMixin:
    """
    - Exige autenticación
    - Filtra el queryset por owner=request.user (salvo staff/súperuser)
    - Setea owner automáticamente en create
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return qs
        return qs.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class PropiedadViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Propiedad.objects.all().order_by("-id")
    serializer_class = PropiedadSerializer
    permission_classes = [IsAuthenticated]

    # --- CREATE con imágenes en la misma request ---
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            propiedad = serializer.save(owner=self.request.user)
        except Exception as e:
            return Response(
                {"detail": f"Error al guardar la propiedad: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # imágenes enviadas en el create
        imagenes_data = request.FILES.getlist("imagenes")
        for imagen_file in imagenes_data:
            PropiedadImagen.objects.create(
                propiedad=propiedad,
                imagen=imagen_file,
            )

        response_serializer = self.get_serializer(propiedad)
        headers = self.get_success_headers(response_serializer.data)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    # --- Subir imágenes luego (acción /subir-imagenes/) ---
    @action(detail=True, methods=["post"], url_path="subir-imagenes")
    def subir_imagenes(self, request, pk=None):
        """
        Permite subir una o varias imágenes para la propiedad {pk}.
        Acepta:
          - 'imagen' (una sola)  o
          - 'imagenes' (lista de archivos)
          - 'descripcion' (opcional)
        """
        try:
            propiedad = self.get_queryset().get(pk=pk)  # respeta owner
        except Propiedad.DoesNotExist:
            return Response(
                {"detail": "Propiedad no encontrada"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SubirImagenesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        imagenes_subidas = []
        descripcion = serializer.validated_data.get("descripcion", "")

        # caso 1: una sola
        imagen = serializer.validated_data.get("imagen")
        if imagen:
            obj = PropiedadImagen.objects.create(
                propiedad=propiedad,
                imagen=imagen,
                descripcion=descripcion,
            )
            imagenes_subidas.append(obj)

        # caso 2: lista
        imagenes = serializer.validated_data.get("imagenes", [])
        for img in imagenes:
            obj = PropiedadImagen.objects.create(
                propiedad=propiedad,
                imagen=img,
                descripcion=descripcion,
            )
            imagenes_subidas.append(obj)

        data = PropiedadImagenSerializer(imagenes_subidas, many=True).data
        return Response(
            {"subidas": len(imagenes_subidas), "imagenes": data},
            status=status.HTTP_201_CREATED,
        )

class PropiedadImagenViewSet(viewsets.ModelViewSet):
    """
    ViewSet para manejar las imágenes individuales de una propiedad.
    
    """
    serializer_class = PropiedadImagenSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PropiedadImagen.objects.all()
        user = self.request.user
        # si es staff/superuser ve todo
        if user.is_staff or user.is_superuser:
            return qs
        # si no, sólo imágenes de sus propiedades
        return qs.filter(propiedad__owner=user)
        queryset = PropiedadImagen.objects.all()
        serializer_class = PropiedadImagenSerializer
        permission_classes = [IsAuthenticated]