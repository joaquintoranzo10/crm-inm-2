from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Q

from propiedades.models import Propiedad
from avisos.models import Aviso


class EstadoLead(models.Model):
    fase = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, default="")

    def __str__(self):
        return self.fase


class Contacto(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="contactos",
        null=True,
        blank=True,
    )

    nombre = models.CharField(max_length=120, blank=True, default="")
    apellido = models.CharField(max_length=120, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    telefono = models.CharField(max_length=50, blank=True, default="")
    estado = models.ForeignKey(
        EstadoLead, null=True, blank=True, on_delete=models.SET_NULL, related_name="contactos"
    )

    last_contact_at = models.DateTimeField(null=True, blank=True)
    next_contact_at = models.DateTimeField(null=True, blank=True)
    next_contact_note = models.CharField(max_length=255, blank=True, default="")
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} {self.apellido}".strip()

    @property
    def proximo_contacto_estado(self) -> str:
        now = timezone.localtime() 
        if not self.next_contact_at:
            return "Pendiente / Por definir"
        fecha_hora_vencimiento = timezone.localtime(self.next_contact_at)
        if fecha_hora_vencimiento < now:
            return "Vencido"
        if fecha_hora_vencimiento.date() == now.date():
            return "Vence hoy"
        hoy_date = now.date()
        fecha_date = fecha_hora_vencimiento.date()
        delta = (fecha_date - hoy_date).days
        if delta <= 0: 
             return "Vence hoy"
        return f"Próximo en {delta} día{'s' if delta != 1 else ''}"

    @property
    def dias_sin_seguimiento(self) -> int | None:
        if not self.last_contact_at:
            now = timezone.localtime()
            return (now.date() - timezone.localtime(self.creado_en).date()).days
        now = timezone.localtime()
        return (now.date() - timezone.localtime(self.last_contact_at).date()).days


TIPO_EVENTO_CHOICES = [
    ("Reunion", "Reunion"),
    ("Visita", "Visita"),
    ("Llamada", "Llamada"),
]


class Evento(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="eventos",
        null=True,
        blank=True,
    )


    TIPO_EVENTO_CHOICES = [
        ("Reunion", "Reunión"),
        ("Visita", "Visita"),
        ("Llamada", "Llamada"),
    ]

    nombre = models.CharField(max_length=120, blank=True, default="")
    apellido = models.CharField(max_length=120, blank=True, default="")
    email = models.EmailField(blank=True, null=True)
    contacto = models.ForeignKey(
        Contacto, null=True, blank=True, on_delete=models.SET_NULL, related_name="eventos"
    )
    propiedad = models.ForeignKey(Propiedad, on_delete=models.CASCADE, related_name="eventos")
    tipo = models.CharField(max_length=20, choices=TIPO_EVENTO_CHOICES)  
    fecha_hora = models.DateTimeField()
    notas = models.TextField(blank=True, default="")
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_hora", "-id"]

    def __str__(self):
        return f"{self.tipo} {self.fecha_hora:%Y-%m-%d %H:%M}"


class EstadoLeadHistorial(models.Model):
    contacto = models.ForeignKey(Contacto, on_delete=models.CASCADE, related_name="historial_estados")
    estado = models.ForeignKey(EstadoLead, null=True, blank=True, on_delete=models.SET_NULL)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.contacto} -> {self.estado or '—'} @ {self.changed_at:%Y-%m-%d %H:%M}"


@receiver(post_save, sender=Contacto)
def programar_seguimiento_inicial(sender, instance: Contacto, created: bool, **kwargs):
   
    if kwargs.get('raw', False):
        return

    if created and not instance.next_contact_at:
        Contacto.objects.filter(pk=instance.pk).update(
            next_contact_at=timezone.now() + timezone.timedelta(days=3),
            next_contact_note="Primer seguimiento (automático)"
        )


@receiver(post_save, sender=Evento)
def sync_contacto_and_aviso_from_evento(sender, instance: Evento, created: bool, **kwargs):

    if kwargs.get('raw', False):
        return

    contacto = instance.contacto
    if not contacto:
        return

    now = timezone.localtime()
    evento_dt = timezone.localtime(instance.fecha_hora)

    # Evento ocurrido (pasado o hoy)
    if evento_dt <= now:
        
        update_fields_list = []
        
        # Actualiza el último contacto si este evento es más reciente
        if not contacto.last_contact_at or evento_dt > contacto.last_contact_at:
            contacto.last_contact_at = evento_dt
            update_fields_list.append("last_contact_at")

        
        is_relevant_event = (
            not contacto.next_contact_at 
            or evento_dt.date() >= timezone.localtime(contacto.next_contact_at).date()
        )

        if is_relevant_event:
            contacto.next_contact_at = now + timezone.timedelta(days=3)
            contacto.next_contact_note = "Programar próximo seguimiento"
            update_fields_list.extend(["next_contact_at", "next_contact_note"])

        if update_fields_list:
            contacto.save(update_fields=update_fields_list)
            
        # Marca como completado o elimina el aviso relacionado
        try:
            aviso = Aviso.objects.get(evento=instance)
            if aviso.estado == 'pendiente':
                aviso.estado = 'completado'
                aviso.save(update_fields=['estado'])
        except Aviso.DoesNotExist:
            pass 

        return

    # Evento futuro
    next_contact_actual = (
        timezone.localtime(contacto.next_contact_at) if contacto.next_contact_at else None
    )
    should_update_next = (
        not next_contact_actual
        or next_contact_actual <= now  
        or evento_dt < next_contact_actual
    )
    if should_update_next:
        contacto.next_contact_at = evento_dt
        if not contacto.next_contact_note or contacto.next_contact_note == "Programar próximo seguimiento":
            base = f"{instance.tipo}"
            if instance.notas:
                snippet = (instance.notas or "").strip().replace("\n", " ")
                if len(snippet) > 80:
                    snippet = snippet[:77] + "..."
                base = f"{base} · {snippet}"
            contacto.next_contact_note = base
        contacto.save(update_fields=["next_contact_at", "next_contact_note"])

    # Crear o actualizar un aviso para este evento futuro
    aviso_titulo = f"Próximo contacto con {contacto.nombre} {contacto.apellido}"
    aviso_descripcion = f"{instance.tipo} sobre la propiedad {instance.propiedad.titulo}" if instance.propiedad else f"{instance.tipo} con el lead"

    Aviso.objects.update_or_create(
        evento=instance,
        defaults={
            'titulo': aviso_titulo,
            'descripcion': aviso_descripcion,
            'fecha': instance.fecha_hora,
            'lead': contacto,
            'propiedad': instance.propiedad,
            'estado': 'pendiente',
            'owner': contacto.owner 
        }
    )

@receiver(post_delete, sender=Evento)
def delete_aviso_on_evento_delete(sender, instance, **kwargs):
    """
    Elimina el aviso asociado cuando se elimina el evento.
    """
    if kwargs.get('raw', False):
        return
    
    try:
        Aviso.objects.get(evento=instance).delete()
    except Aviso.DoesNotExist:
        pass