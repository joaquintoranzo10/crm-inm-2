# avisos/management/commands/actualizar_estados_avisos.py
"""
Actualiza el estado de los avisos "pendiente" cuya fecha ya pasó:

- Si el aviso está vinculado a un Evento real (reunión/visita/llamada
  agendada), lo pasamos a "completado". Normalmente esto ya lo hace la
  señal de leads/models.py apenas se vuelve a guardar ese Evento, pero
  si nadie lo vuelve a tocar después de la fecha, el aviso se queda
  "pendiente" para siempre. Este comando es la red de seguridad para
  esos casos.
- Si el aviso NO tiene un Evento vinculado (un "recordatorio libre",
  ej: "Pedir seña", cargado a mano con "+ Agregar Recordatorio"), no
  hay forma de saber si se hizo o no -- lo pasamos a "atrasado" para
  que quede claro que venció sin resolverse.

Pensado para correr todos los días junto con enviar_recordatorios_diarios
(desde el mismo endpoint de cron que ya existe).

Uso manual:
    python manage.py actualizar_estados_avisos
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from avisos.models import Aviso


class Command(BaseCommand):
    help = "Marca como 'completado' o 'atrasado' los avisos pendientes cuya fecha ya pasó."

    def handle(self, *args, **options):
        ahora = timezone.now()

        vencidos_con_evento = Aviso.objects.filter(
            estado="pendiente", evento__isnull=False, fecha__lt=ahora
        )
        completados = vencidos_con_evento.update(estado="completado")

        vencidos_libres = Aviso.objects.filter(
            estado="pendiente", evento__isnull=True, fecha__lt=ahora
        )
        atrasados = vencidos_libres.update(estado="atrasado")

        self.stdout.write(
            self.style.SUCCESS(
                f"Avisos actualizados: {completados} completados (tenían evento), "
                f"{atrasados} atrasados (recordatorios libres sin resolver)."
            )
        )
