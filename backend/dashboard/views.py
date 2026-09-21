from django.shortcuts import render
from django.utils import timezone
from django.db.models import Count
from rest_framework.decorators import api_view
from rest_framework.response import Response

from leads.models import Contacto, EstadoLead
from avisos.models import Aviso 
from propiedades.models import Propiedad

@api_view(["GET"])
def dashboard_data(request):
    """API REST para métricas del dashboard filtradas por el usuario autenticado"""
    usuario = request.user

    # 1. Filtramos todo por el dueño actual
    contactos_usuario = Contacto.objects.filter(owner=usuario)
    propiedades_usuario = Propiedad.objects.filter(owner=usuario)
    avisos_usuario = Aviso.objects.filter(owner=usuario)

    # 2. Hacemos los cálculos sobre los querysets ya filtrados
    total_contactos = contactos_usuario.count()
    total_propiedades = propiedades_usuario.count()
    propiedades_vendidas = propiedades_usuario.filter(estado__icontains="vendid").count()
    
    propiedades_activas = propiedades_usuario.exclude(estado__icontains="vendid")
    prop_en_venta = propiedades_activas.filter(disponibilidad__iexact="venta").count()
    prop_en_alquiler = propiedades_activas.filter(disponibilidad__iexact="alquiler").count()

    contactos_por_estado = (
        contactos_usuario.values("estado__fase")
        .annotate(total=Count("estado"))
        .order_by("estado__fase")
    )

    ahora = timezone.now()
    proximos_contactos_count = contactos_usuario.filter(next_contact_at__gte=ahora).count()
    atrasados_count = contactos_usuario.filter(next_contact_at__lt=ahora).count()

    ultimos_contactos = list(
        contactos_usuario.order_by("-id").values("id", "nombre", "apellido", "email")[:5]
    )
    
    avisos_pendientes_count = avisos_usuario.filter(estado="pendiente").count()
    avisos_atrasados_count = avisos_usuario.filter(estado="atrasado").count()

    data = {
        "total_contactos": total_contactos,
        "total_propiedades": total_propiedades,
        "propiedades_vendidas": propiedades_vendidas,
        "propiedades_en_venta": prop_en_venta,
        "propiedades_en_alquiler": prop_en_alquiler,
        "contactos_por_estado": list(contactos_por_estado),
        "proximos_contactos": proximos_contactos_count,
        "atrasados": atrasados_count,
        "ultimos_contactos": ultimos_contactos,
        "avisos_pendientes": avisos_pendientes_count,
        "avisos_atrasados": avisos_atrasados_count,
    }
    return Response(data)


# Si también querés usar Templates (HTML)
def index(request):
    """Renderiza dashboard en HTML"""
    ahora = timezone.now()

    context = {
        "total_contactos": Contacto.objects.count(),
        "contactos_por_estado": Contacto.objects.values("estado__fase")
                                       .annotate(total=Count("estado")),
        "proximos_contactos": Contacto.objects.filter(next_contact_at__gte=ahora).count(),
        "atrasados": Contacto.objects.filter(next_contact_at__lt=ahora).count(),
        "ultimos_contactos": Contacto.objects.order_by("-id")[:5],
    }
    return render(request, "dashboard/index.html", context)