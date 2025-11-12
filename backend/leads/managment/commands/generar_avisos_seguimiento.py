# backend/leads/management/commands/generar_avisos_seguimiento.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from leads.models import Contacto
from avisos.models import Aviso
import datetime

class Command(BaseCommand):
    help = 'Genera avisos para leads (Contactos) cuyo seguimiento está vencido.'

    def handle(self, *args, **options):
        self.stdout.write("Buscando seguimientos vencidos...")
        now = timezone.now()
        
        # Estados finalizados (ajusta 'Vendido' y 'Rechazado' a tus fases)
        estados_finalizados = ['Vendido', 'Rechazado', 'Lead Vendido', 'Lead Rechazado']
        
        # Leads vencidos:
        # - Tienen un next_contact_at en el pasado (o hoy)
        # - NO están en un estado finalizado
        leads_vencidos = Contacto.objects.filter(
            next_contact_at__lte=now
        ).exclude(
            Q(estado__fase__in=estados_finalizados)
        )

        avisos_creados = 0
        
        for lead in leads_vencidos:
            # Evitar duplicados: no crear si ya hay un aviso PENDIENTE
            # para este lead que NO esté atado a un evento (es decir, un aviso genérico)
            aviso_existente = Aviso.objects.filter(
                lead=lead, 
                estado='pendiente',
                evento__isnull=True 
            ).exists()

            if not aviso_existente:
                Aviso.objects.create(
                    titulo=f"Seguimiento Vencido: {lead.nombre} {lead.apellido}",
                    descripcion=f"El seguimiento programado para el {lead.next_contact_at.strftime('%d/%m/%Y')} está vencido. Última nota: '{lead.next_contact_note}'",
                    fecha=lead.next_contact_at, # Usamos la fecha de vencimiento
                    lead=lead,
                    # NOTA: Si tu modelo Aviso tiene 'owner', descomenta la siguiente línea
                    # owner=lead.owner, 
                    estado='pendiente'
                )
                avisos_creados += 1
                
        self.stdout.write(self.style.SUCCESS(f'Proceso finalizado. Se crearon {avisos_creados} avisos nuevos.'))