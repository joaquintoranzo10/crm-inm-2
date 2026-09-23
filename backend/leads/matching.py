from django.db.models import Q
from propiedades.models import Propiedad
from .models import Contacto

def calcular_propiedades_sugeridas(contacto):
    
    preferencias = contacto.preferencias.all()
    
    if not preferencias.exists():
        return Propiedad.objects.none()

    # Filtro de seguridad: Solo disponibles y del mismo dueño que el Lead
    propiedades_base = Propiedad.objects.filter(
        estado="disponible", 
        owner=contacto.owner
    )

    query_final = Q()
    
    for pref in preferencias:
        q_pref = Q()
        
        # Operación (Venta / Alquiler)
        if pref.operacion:
            q_pref &= Q(disponibilidad__iexact=pref.operacion)
            
        # Tipo de Propiedad (Casa, Depto, etc)
        if pref.tipo_de_propiedad:
            q_pref &= Q(tipo_de_propiedad__iexact=pref.tipo_de_propiedad)
            
        # Ubicación: Busca coincidencias parciales en localidad, barrio o la ubicación general
        if pref.localidad:
            q_pref &= (Q(localidad__icontains=pref.localidad) | Q(ubicacion__icontains=pref.localidad))
        if pref.barrio:
            q_pref &= (Q(barrio__icontains=pref.barrio) | Q(ubicacion__icontains=pref.barrio))
            
        # Presupuesto y Moneda (Filtro estricto de rangos)
        if pref.moneda:
            q_pref &= Q(moneda__iexact=pref.moneda)
        if pref.presupuesto_min:
            q_pref &= Q(precio__gte=pref.presupuesto_min)
        if pref.presupuesto_max:
            q_pref &= Q(precio__lte=pref.presupuesto_max)
            
        # Ambientes
        if pref.ambientes_min:
            q_pref &= Q(ambiente__gte=pref.ambientes_min)
        
        # Sumamos este "perfil de búsqueda" al query final con un OR (|)
        query_final |= q_pref

    if not query_final:
        return Propiedad.objects.none()

    # Ejecutamos la consulta, eliminamos duplicados (distinct) y ordenamos por precio
    return propiedades_base.filter(query_final).distinct().order_by('precio')


def calcular_leads_interesados(propiedad):
    
    # Excluimos leads que ya fueron rechazados o vendidos
    leads_base = Contacto.objects.filter(
        owner=propiedad.owner
    ).exclude(estado__fase__icontains="rechazado").exclude(estado__fase__icontains="vendido")
    
    query = Q()
    
    # El lead debe buscar este tipo de propiedad (o no haber especificado tipo)
    query &= (Q(preferencias__tipo_de_propiedad__iexact=propiedad.tipo_de_propiedad) | Q(preferencias__tipo_de_propiedad=""))
    
    # El lead debe buscar esta operación
    query &= (Q(preferencias__operacion__iexact=propiedad.disponibilidad) | Q(preferencias__operacion=""))
    
    # El presupuesto del lead debe abarcar el precio de la propiedad
    query &= (Q(preferencias__moneda__iexact=propiedad.moneda) | Q(preferencias__moneda=""))
    query &= (Q(preferencias__presupuesto_min__lte=propiedad.precio) | Q(preferencias__presupuesto_min__isnull=True))
    query &= (Q(preferencias__presupuesto_max__gte=propiedad.precio) | Q(preferencias__presupuesto_max__isnull=True))
    
    # Ambientes
    query &= (Q(preferencias__ambientes_min__lte=propiedad.ambiente) | Q(preferencias__ambientes_min__isnull=True))
    
    return leads_base.filter(query).distinct()