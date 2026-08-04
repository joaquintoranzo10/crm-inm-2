from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from leads.models import Contacto

class Command(BaseCommand):
    help = 'Envía correos mediante SendGrid a los dueños de los leads que deben contactarse hoy.'

    def handle(self, *args, **options):
   
        hoy = timezone.localdate()
        
      
        contactos_hoy = Contacto.objects.filter(
            next_contact_at__date=hoy,
            owner__isnull=False,
            owner__email__isnull=False
        ).exclude(estado__fase__in=['Vendido', 'Rechazado', 'Lead Vendido', 'Lead Rechazado'])

        if not contactos_hoy.exists():
            self.stdout.write("No hay seguimientos programados para hoy.")
            return


        recordatorios_por_usuario = {}
        for lead in contactos_hoy:
            email_destino = lead.owner.email
            if email_destino not in recordatorios_por_usuario:
                recordatorios_por_usuario[email_destino] = []
            recordatorios_por_usuario[email_destino].append(lead)

       
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
                self.stdout.write(self.style.SUCCESS(f'Correo enviado exitosamente a {email}.'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error al enviar a {email}: {e}'))