from rest_framework import serializers
from .models import Propiedad, PropiedadImagen

# 1. Serializer de Imágenes (MANUAL)
class PropiedadImagenSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    imagen = serializers.ImageField()
    descripcion = serializers.CharField(required=False, allow_blank=True, allow_null=True)

# 2. Serializer Principal (MANUAL - NO hereda de ModelSerializer)
class PropiedadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    
    # Campos de texto explícitos
    codigo = serializers.CharField(max_length=50)
    titulo = serializers.CharField(max_length=255)
    descripcion = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    ubicacion = serializers.CharField(max_length=255, required=False, allow_blank=True)
    
    tipo_de_propiedad = serializers.CharField(max_length=50)
    disponibilidad = serializers.CharField(max_length=50)
    moneda = serializers.CharField(max_length=3, default='USD')
    estado = serializers.CharField(max_length=50, default='disponible')
    
    # Campos numéricos
    precio = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    ambiente = serializers.IntegerField(required=False, allow_null=True)
    antiguedad = serializers.IntegerField(required=False, allow_null=True)
    banos = serializers.IntegerField(required=False, allow_null=True)
    superficie = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    
    fecha_alta = serializers.DateTimeField(read_only=True)

    # Campos calculados manualmente
    owner = serializers.SerializerMethodField()
    imagenes = serializers.SerializerMethodField()

    def get_owner(self, obj):
        return obj.owner.username if obj.owner else None

    def get_imagenes(self, obj):
        # Busca las imágenes manualmente para evitar errores
        try:
            qs = obj.imagenes.all()
            return PropiedadImagenSerializer(qs, many=True).data
        except Exception:
            return []

    # Guardado manual
    def create(self, validated_data):
        user = self.context['request'].user
        return Propiedad.objects.create(owner=user, **validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

# 3. Serializer de Subida (MANUAL)
class SubirImagenesSerializer(serializers.Serializer):
    imagenes = serializers.ListField(
        child=serializers.ImageField(), 
        allow_empty=False, 
        required=False
    )
    imagen = serializers.ImageField(required=False)
    descripcion = serializers.CharField(required=False, allow_blank=True)