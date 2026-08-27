from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Contacto, EstadoLeadHistorial


@receiver(pre_save, sender=Contacto, dispatch_uid="leads_contacto_cache_old_estado_v1")
def _cache_old_estado(sender, instance: Contacto, **kwargs):
    if instance.pk:
        try:
            old = Contacto.objects.only("estado_id").get(pk=instance.pk)
            instance._old_estado_id = old.estado_id
        except Contacto.DoesNotExist:
            instance._old_estado_id = None
    else:
        instance._old_estado_id = None


@receiver(post_save, sender=Contacto, dispatch_uid="leads_contacto_log_estado_change_v2")
def _log_estado_change(sender, instance: Contacto, created, **kwargs):
    if not instance.estado_id:
        return

    last = (
        EstadoLeadHistorial.objects
        .filter(contacto=instance)
        .only("estado_id", "changed_at")
        .order_by("-changed_at")
        .first()
    )
    if last and last.estado_id == instance.estado_id:
        return

    if created:
        EstadoLeadHistorial.objects.create(contacto=instance, estado_id=instance.estado_id)
        return

    old_id = getattr(instance, "_old_estado_id", None)
    if old_id != instance.estado_id:
        EstadoLeadHistorial.objects.create(contacto=instance, estado_id=instance.estado_id)