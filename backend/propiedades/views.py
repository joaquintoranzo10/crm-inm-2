from rest_framework import viewsets, status, mixins
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


class PropiedadViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Propiedad.objects.all().order_by("-id")
    serializer_class = PropiedadSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            propiedad = serializer.save(owner=request.user)
        except Exception as e:
            return Response(
                {"detail": f"Error al guardar la propiedad: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


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
 
    @action(detail=True, methods=["post"], url_path="subir-imagenes")
    def subir_imagenes(self, request, pk=None):
        
        try:
            propiedad = self.get_queryset().get(pk=pk) 
        except Propiedad.DoesNotExist:
            return Response(
                {"detail": "Propiedad no encontrada"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SubirImagenesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        imagenes_subidas = []
        descripcion = serializer.validated_data.get("descripcion", "")

        imagen = serializer.validated_data.get("imagen")
        if imagen:
            obj = PropiedadImagen.objects.create(
                propiedad=propiedad,
                imagen=imagen,
                descripcion=descripcion,
            )
            imagenes_subidas.append(obj)

       
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

   
    @action(detail=True, methods=["get"], url_path="leads-interesados")
    def leads_interesados(self, request, pk=None):
        
        try:
            propiedad = self.get_queryset().get(pk=pk)  
        except Propiedad.DoesNotExist:
            return Response(
                {"detail": "Propiedad no encontrada"},
                status=status.HTTP_404_NOT_FOUND,
            )

        from leads.matching import calcular_leads_interesados  
        from leads.serializers import ContactoSerializer

        leads = calcular_leads_interesados(propiedad)
        ser = ContactoSerializer(leads, many=True)
        return Response(ser.data)


class PropiedadImagenViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = PropiedadImagen.objects.all()
    serializer_class = PropiedadImagenSerializer
    permission_classes = [IsAuthenticated]