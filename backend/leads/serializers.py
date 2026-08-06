# leads/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import AnonymousUser
from django.db.models import F, Value, ExpressionWrapper, DateTimeField
from django.utils import timezone
from datetime import timedelta

# Importamos Aviso para gestionar el quick-contact
from avisos.models import Aviso 
from .models import EstadoLead, Contacto, Evento, EstadoLeadHistorial,HistorialLead
from propiedades.models import Propiedad

# Duración por defecto de un evento (minutos)
DEFAULT_EVENT_DURATION_MIN = 30

class EstadoLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoLead
        fields = ["id", "fase", "descripcion"]


class HistorialLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialLead
        fields = ['id', 'contacto', 'nota', 'creado_en']
        read_only_fields = ['creado_en']


class ContactoSerializer(serializers.ModelSerializer):
   
    owner = serializers.ReadOnlyField(source="owner.id")


    estado = serializers.PrimaryKeyRelatedField(
        queryset=EstadoLead.objects.all(), allow_null=True, required=False
    )

    estado_detalle = EstadoLeadSerializer(source="estado", read_only=True)

   
    last_contact_at = serializers.DateTimeField(required=False, allow_null=True)
    next_contact_at = serializers.DateTimeField(required=False, allow_null=True)
    next_contact_note = serializers.CharField(required=False, allow_blank=True, max_length=255)

   
    proximo_contacto_estado = serializers.ReadOnlyField()
    dias_sin_seguimiento = serializers.ReadOnlyField()

    class Meta:
        model = Contacto
        fields = [
            "id",
            "owner",
            "nombre",
            "apellido",
            "email",
            "telefono",
            "estado",
            "estado_detalle",
            # seguimiento
            "last_contact_at",
            "next_contact_at",
            "next_contact_note",
            # derivados
            "proximo_contacto_estado",
            "dias_sin_seguimiento",
            # metadatos
            "creado_en",
        ]
        read_only_fields = [
            "id",
            "owner",
            "estado_detalle",
            "proximo_contacto_estado",
            "dias_sin_seguimiento",
            "creado_en",
        ]

    def validate(self, attrs):
        note = attrs.get("next_contact_note", getattr(self.instance, "next_contact_note", ""))
        if note and len(note) > 255:
            raise serializers.ValidationError({"next_contact_note": "Máximo 255 caracteres."})

        next_contact = attrs.get("next_contact_at")
        if next_contact:
            now_local = timezone.localtime(timezone.now())
            next_contact_local = timezone.localtime(next_contact)
            if next_contact_local < now_local:
                raise serializers.ValidationError(
                    {"next_contact_at": "La fecha de próximo contacto debe ser la fecha y hora actual o una futura."}
                )
            
        return attrs

   
    def create(self, validated_data):
        contacto = Contacto.objects.create(**validated_data)
        nota_inicial = validated_data.get("next_contact_note")
        if nota_inicial:
            HistorialLead.objects.create(
                contacto=contacto,
                nota=f"Nota inicial: {nota_inicial}"
            )
        return contacto

    def update(self, instance, validated_data):
        
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save() 

        
        if "next_contact_at" in validated_data or "next_contact_note" in validated_data:
            
           
            quick_aviso_qs = Aviso.objects.filter(lead=instance, evento__isnull=True)
            
            next_contact_at = validated_data.get("next_contact_at")
            next_contact_note = validated_data.get("next_contact_note")
            
            if next_contact_at is not None:
                
                titulo = f"Seguimiento programado con {instance.nombre} {instance.apellido}"
                descripcion = next_contact_note or "Próximo contacto registrado manualmente."
                
                Aviso.objects.update_or_create(
                    lead=instance,
                    evento=None, 
                    defaults={
                        'titulo': titulo,
                        'descripcion': descripcion,
                        'fecha': next_contact_at,
                        'estado': 'pendiente', 
                        'propiedad': None, 
                    }
                )
                
            else:
                quick_aviso_qs.delete()
        
        return instance 


class EstadoLeadHistorialSerializer(serializers.ModelSerializer):
    estado = EstadoLeadSerializer(read_only=True)

    class Meta:
        model = EstadoLeadHistorial
        fields = ["id", "contacto", "estado", "changed_at"]


class EventoSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.id")

    contacto = serializers.PrimaryKeyRelatedField(
        queryset=Contacto.objects.all(), allow_null=True, required=False
    )
    propiedad = serializers.PrimaryKeyRelatedField(
        queryset=Propiedad.objects.all()
    )

    contacto_nombre = serializers.SerializerMethodField(read_only=True)
    propiedad_titulo = serializers.SerializerMethodField(read_only=True)
    tipo = serializers.ChoiceField(choices=Evento.TIPO_EVENTO_CHOICES)

    class Meta:
        model = Evento
        fields = [
            "id",
            "owner",
            "nombre",
            "apellido",
            "email",
            "contacto",
            "contacto_nombre",
            "propiedad",
            "propiedad_titulo",
            "tipo",
            "fecha_hora",
            "notas",
            "creado_en",
        ]
        read_only_fields = ["id", "creado_en", "contacto_nombre", "propiedad_titulo"]

    def get_contacto_nombre(self, obj):
        if obj.contacto:
            nombre_completo = f"{obj.contacto.nombre or ''} {obj.contacto.apellido or ''}".strip()
            return nombre_completo if nombre_completo else f"Lead #{obj.contacto.id}"
        if obj.nombre or obj.apellido:
            return f"{obj.nombre or ''} {obj.apellido or ''}".strip()
        return None

    def get_propiedad_titulo(self, obj):
        if obj.propiedad:
            return obj.propiedad.titulo or f"Propiedad #{obj.propiedad.id}"
        return None
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and not isinstance(user, AnonymousUser) and not (user.is_staff or user.is_superuser):
           
            self.fields["contacto"].queryset = Contacto.objects.filter(owner=user)
            self.fields["propiedad"].queryset = Propiedad.objects.filter(owner=user)

    
    def validate_contacto(self, value):
        if value is None:
            return value
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and not (user.is_staff or user.is_superuser):
            if value.owner_id != user.id:
                raise serializers.ValidationError("Contacto no pertenece al usuario autenticado.")
        return value

    def validate_propiedad(self, value):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and not (user.is_staff or user.is_superuser):
            if value.owner_id != user.id:
                raise serializers.ValidationError("Propiedad no pertenece al usuario autenticado.")
        return value

    
    def validate(self, attrs):
        
        if "email" in attrs and not attrs["email"]:
            attrs.pop("email", None)

        fecha_hora = attrs.get("fecha_hora", getattr(self.instance, "fecha_hora", None))
        propiedad = attrs.get("propiedad", getattr(self.instance, "propiedad", None))
        if not fecha_hora or not propiedad:
            return attrs

        fecha_hora_local = timezone.localtime(fecha_hora)
        now_local = timezone.localtime(timezone.now())
        if fecha_hora_local < now_local:
            raise serializers.ValidationError("No se puede programar un evento en una fecha/hora pasada.")

        duration_min = DEFAULT_EVENT_DURATION_MIN
        new_start = fecha_hora_local
        new_end = new_start + timedelta(minutes=duration_min)

        base_qs = Evento.objects.filter(propiedad=propiedad)
        if self.instance and getattr(self.instance, "id", None):
            base_qs = base_qs.exclude(id=self.instance.id)

        for ev in base_qs:
            ev_start = timezone.localtime(ev.fecha_hora)
            ev_end = ev_start + timedelta(minutes=duration_min)

            if new_start == ev_start:
                raise serializers.ValidationError("Ya existe un evento exactamente en esa fecha y hora para la misma propiedad.")
            
            if new_start < ev_end and new_end > ev_start:
                raise serializers.ValidationError(
                    f"El horario solapa con otro evento en la misma propiedad (desde {ev_start.isoformat()})."
                )

        return attrs
