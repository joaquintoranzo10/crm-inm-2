from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from leads.models import Contacto
from datetime import datetime, time, timedelta

class Command(BaseCommand):
    help = 'Envía correos mediante SendGrid a los dueños de los leads que deben contactarse hoy.'

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
                recordatorios_por_usuario[email_destino] = []
            recordatorios_por_usuario[email_destino].append(lead)

    
        if not recordatorios_por_usuario:
            self.stdout.write(self.style.ERROR("❌ Se encontraron leads para hoy, pero no se puede mandar el correo porque te falta configurar tu email."))
            return

        for email, leads in recordatorios_por_usuario.items():
            asunto = f"Real Connect: Tenés {len(leads)} seguimientos para hoy"
            
            cuerpo = "Hola,\n\nEstos son los clientes a los que debés contactar hoy:\n\n"
            for lead in leads:
                cuerpo += f"• {lead.nombre} {lead.apellido} | Tel: {lead.telefono}\n"
                if lead.next_contact_note:
                    cuerpo += f"  Nota: {lead.next_contact_note}\n"
                cuerpo += "\n"
            
            cuerpo += "¡Éxitos en tus gestiones!\n\nEquipo Real Connect CRM"

            try:
                send_mail(
                    asunto,
                    cuerpo,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
                self.stdout.write(self.style.SUCCESS(f'✅ Correo enviado exitosamente a {email}.'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error al enviar a {email}: {e}'))