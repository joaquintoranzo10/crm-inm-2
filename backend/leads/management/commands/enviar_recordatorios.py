from django.core.management.base import BaseCommand
from django.utils import timezone
from leads.models import Contacto
from usuarios.email_utils import send_recordatorios_email
from datetime import datetime, time, timedelta

class Command(BaseCommand):
    help = 'Envía correos (con el formato unificado de Real Connect) a los dueños de los leads que deben contactarse hoy.'

    def handle(self, *args, **options):

        hoy = timezone.localdate()
        inicio_hoy = timezone.make_aware(datetime.combine(hoy, time.min))
        fin_hoy = inicio_hoy + timedelta(days=1)

        contactos_hoy = Contacto.objects.filter(
            next_contact_at__gte=inicio_hoy,
            next_contact_at__lt=fin_hoy,
        ).exclude(
            estado__fase__in=['Vendido', 'Rechazado', 'Lead Vendido', 'Lead Rechazado']
        )

        if not contactos_hoy.exists():
            self.stdout.write("No hay absolutamente ningún seguimiento programado para hoy en la base de datos.")
            return

        recordatorios_por_usuario = {}
        for lead in contactos_hoy:

            if not getattr(lead, 'owner', None):
                self.stdout.write(self.style.WARNING(f"⚠️ El lead '{lead.nombre}' vence hoy, pero no tiene un vendedor (owner) asignado."))
                continue

            email_destino = lead.owner.email
            if not email_destino:
                self.stdout.write(self.style.WARNING(f"⚠️ El lead '{lead.nombre}' es tuyo, pero TU USUARIO ('{lead.owner.username}') NO TIENE EMAIL cargado en el sistema."))
                continue

            if email_destino not in recordatorios_por_usuario:
                recordatorios_por_usuario[email_destino] = {
                    "nombre": getattr(lead.owner, "first_name", "") or lead.owner.username,
                    "leads": [],
                }
            recordatorios_por_usuario[email_destino]["leads"].append({
                "nombre": lead.nombre,
                "apellido": lead.apellido,
                "telefono": lead.telefono,
                "nota": lead.next_contact_note,
            })

        if not recordatorios_por_usuario:
            self.stdout.write(self.style.ERROR("❌ Se encontraron leads para hoy, pero no se puede mandar el correo porque te falta configurar tu email."))
            return

        for email, data in recordatorios_por_usuario.items():
            enviado = send_recordatorios_email(email, data["nombre"], data["leads"])
            if enviado:
                self.stdout.write(self.style.SUCCESS(f'✅ Correo enviado exitosamente a {email}.'))
            else:
                self.stdout.write(self.style.ERROR(f'❌ Error al enviar a {email}.'))