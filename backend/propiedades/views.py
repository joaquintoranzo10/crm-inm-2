from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from .models import Propiedad, PropiedadImagen
from .serializers import (PropiedadSerializer,SubirImagenesSerializer,PropiedadImagenSerializer,)

class OwnedQuerysetMixin:
    """
    - Exige autenticación
    - Filtra el queryset por owner=request.user (salvo staff/superuser)
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
    queryset = Propiedad.objects.all().order_by('-id')
    serializer_class = PropiedadSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Crea la propiedad y guarda las imágenes enviadas en una sola petición multipart/form-data.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            propiedad = serializer.save(owner=self.request.user)
        except Exception as e:
            return Response(
                {"detail": f"Error al guardar la propiedad: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Obtener imágenes adjuntas al crear
        imagenes_data = request.FILES.getlist('imagenes')
        if not imagenes_data and 'imagen' in request.FILES:
            imagenes_data = [request.FILES['imagen']]

        for imagen_file in imagenes_data:
            PropiedadImagen.objects.create(
                propiedad=propiedad,
                imagen=imagen_file
            )

        response_serializer = self.get_serializer(propiedad)
        headers = self.get_success_headers(response_serializer.data)
        return Response(
            response_serializer.data, 
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    @action(detail=True, methods=["post"], url_path="subir-imagenes")
    def subir_imagenes(self, request, pk=None):
        """
        Permite subir una o varias imágenes para la propiedad {pk}.
        Acepta tanto la clave 'imagenes' (múltiples) como 'imagen' (individual).
        """
        try:
            propiedad = self.get_queryset().get(pk=pk)  # Respeta el filtro de owner
        except Propiedad.DoesNotExist:
            return Response(
                {"detail": "Propiedad no encontrada"}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # 1. Extraer archivos de request.FILES soportando plural ('imagenes') y singular ('imagen')
        files = request.FILES.getlist('imagenes')
        if not files and 'imagen' in request.FILES:
            files = [request.FILES['imagen']]

        if not files:
            return Response(
                {"detail": "No se adjuntó ningún archivo de imagen. Usa la clave 'imagenes' o 'imagen'."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        descripcion = request.data.get("descripcion", "")

        # 2. Guardar cada imagen en la base de datos asociada a la propiedad
        imagenes_subidas = []
        for img in files:
            obj = PropiedadImagen.objects.create(
                propiedad=propiedad,
                imagen=img,
                descripcion=descripcion
            )
            imagenes_subidas.append(obj)

        data = PropiedadImagenSerializer(imagenes_subidas, many=True).data
        return Response(
            {"subidas": len(imagenes_subidas), "imagenes": data}, 
            status=status.HTTP_201_CREATED
        )


# ViewSet para borrar imágenes
class PropiedadImagenViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = PropiedadImagen.objects.all()
    serializer_class = PropiedadImagenSerializer
    permission_classes = [IsAuthenticated]