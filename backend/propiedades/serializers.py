from rest_framework import serializers
from .models import Propiedad, PropiedadImagen


class PropiedadImagenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropiedadImagen
        fields = [
            'id',
            'imagen',
            'descripcion',
            'propiedad',
        ]


class PropiedadSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.id")

    # Asegura que DRF sepa de dónde sacar las imágenes
    imagenes = PropiedadImagenSerializer(
        many=True,
        read_only=True,
        source='propiedadimagen_set'   # si NO usaste related_name en el modelo
    )

    tipo_de_propiedad = serializers.ChoiceField(choices=Propiedad.TIPO_DE_PROPIEDAD_CHOICES)
    estado = serializers.ChoiceField(choices=Propiedad.ESTADO_CHOICES)
    moneda = serializers.ChoiceField(choices=Propiedad.MONEDA_CHOICES)

    class Meta:
        model = Propiedad
        fields = [
            "id",
            "owner",
            "codigo",
            "titulo",
            "descripcion",
            "ubicacion",
            "tipo_de_propiedad",
            "disponibilidad",
            "precio",
            "moneda",
            "ambiente",
            "antiguedad",
            "banos",
            "superficie",
            "fecha_alta",
            "estado",
            "imagenes",
        ]
        read_only_fields = ["id", "fecha_alta"]


class SubirImagenesSerializer(serializers.Serializer):
    imagenes = serializers.ListField(
        child=serializers.ImageField(), 
        allow_empty=False, 
        required=False
    )
    imagen = serializers.ImageField(required=False)
    descripcion = serializers.CharField(required=False, allow_blank=True)
