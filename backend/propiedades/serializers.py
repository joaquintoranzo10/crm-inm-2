from rest_framework import serializers
from .models import Propiedad, PropiedadImagen


class PropiedadImagenSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    imagen = serializers.ImageField()
    descripcion = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class PropiedadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    codigo = serializers.CharField(max_length=50)
    titulo = serializers.CharField(max_length=255)
    descripcion = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    ubicacion = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    tipo_de_propiedad = serializers.CharField(max_length=50, default='casa')
    disponibilidad = serializers.CharField(max_length=50, default='disponible')
    moneda = serializers.CharField(max_length=3, default='USD')
    estado = serializers.CharField(max_length=50, default='disponible')
    precio = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    ambientes = serializers.IntegerField(required=False, allow_null=True)
    ambiente = serializers.IntegerField(required=False, allow_null=True)
    antiguedad = serializers.IntegerField(required=False, allow_null=True)
    banos = serializers.IntegerField(required=False, allow_null=True)
    superficie = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    fecha_alta = serializers.DateTimeField(read_only=True)
    owner = serializers.SerializerMethodField()
    imagenes = serializers.SerializerMethodField()

    def get_owner(self, obj):
        return obj.owner.username if getattr(obj, 'owner', None) else None

    def get_imagenes(self, obj):
        try:
            qs = obj.imagenes.all()
            return PropiedadImagenSerializer(qs, many=True).data
        except Exception:
            return []

    def create(self, validated_data):
<<<<<<< HEAD
        has_ambientes = hasattr(Propiedad, 'ambientes')
        has_ambiente = hasattr(Propiedad, 'ambiente')
        ambientes_val = validated_data.pop('ambientes', None)
        ambiente_val = validated_data.pop('ambiente', None)
        val = ambientes_val if ambientes_val is not None else ambiente_val

        if val is not None:
            if has_ambientes:
                validated_data['ambientes'] = val
            elif has_ambiente:
                validated_data['ambiente'] = val

        if 'owner' not in validated_data:
            request = self.context.get('request')
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                validated_data['owner'] = request.user

        return Propiedad.objects.create(**validated_data)
=======
        validated_data.pop('owner', None) 
        user = self.context['request'].user
        return Propiedad.objects.create(owner=user, **validated_data)
>>>>>>> 8dc177ba8c3c7e8ad57258d939b9966106af79dc

    def update(self, instance, validated_data):
        has_ambientes = hasattr(Propiedad, 'ambientes')
        has_ambiente = hasattr(Propiedad, 'ambiente')

        ambientes_val = validated_data.pop('ambientes', None)
        ambiente_val = validated_data.pop('ambiente', None)
        val = ambientes_val if ambientes_val is not None else ambiente_val

        if val is not None:
            if has_ambientes:
                validated_data['ambientes'] = val
            elif has_ambiente:
                validated_data['ambiente'] = val

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class SubirImagenesSerializer(serializers.Serializer):
    imagenes = serializers.ListField(
        child=serializers.ImageField(), 
        allow_empty=False, 
        required=False
    )
    imagen = serializers.ImageField(required=False)
    descripcion = serializers.CharField(required=False, allow_blank=True)