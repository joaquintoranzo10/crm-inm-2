from django.core.management.base import BaseCommand
from django.utils import timezone

from avisos.models import Aviso


class Command(BaseCommand):
    help = "Envía por email los avisos pendientes de hoy (o vencidos) que todavía no fueron notificados."

    def handle(self, *args, **options):
       
        from avisos.views import _enviar_notificacion_aviso

        ahora = timezone.localtime()
        fin_de_hoy = ahora.replace(hour=23, minute=59, second=59, microsecond=999999)

        avisos = (
            Aviso.objects.filter(estado="pendiente", email_enviado=False, fecha__lte=fin_de_hoy)
            .select_related("lead", "propiedad", "owner")
        )

        enviados = 0
        omitidos_sin_owner = 0

        for aviso in avisos:
            if not aviso.owner:
                omitidos_sin_owner += 1
                continue

            _enviar_notificacion_aviso(aviso, aviso.owner)
            aviso.email_enviado = True
            aviso.save(update_fields=["email_enviado"])
            enviados += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Recordatorios enviados: {enviados}. "
                f"Omitidos por no tener owner: {omitidos_sin_owner}."
            )
        )
