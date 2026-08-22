import unicodedata
from decimal import Decimal, InvalidOperation
from propiedades.models import Propiedad

def _to_decimal(value):
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None

def _clean(text):
    
    if not text:
        return ""
    
    text = unicodedata.normalize('NFD', text)
    text = text.encode('ascii', 'ignore').decode('utf-8')
    return text.lower().strip()

def calcular_matches(contacto, top_n=10):
    pref = getattr(contacto, "preferencia", None)
    if pref is None:
        return Propiedad.objects.none()

   
    qs = Propiedad.objects.filter(
        owner=contacto.owner,
        estado="disponible",
    )

    if pref.tipo_de_propiedad:
        qs = qs.filter(tipo_de_propiedad=pref.tipo_de_propiedad)

    if pref.presupuesto_min or pref.presupuesto_max:
        qs = qs.filter(moneda=pref.moneda)
        if pref.presupuesto_min:
            qs = qs.filter(precio__gte=pref.presupuesto_min)
        if pref.presupuesto_max:
            qs = qs.filter(precio__lte=pref.presupuesto_max)

    if pref.ambientes_min:
        qs = qs.filter(ambiente__gte=pref.ambientes_min)


    loc_pref = _clean(pref.localidad)
    bar_pref = _clean(pref.barrio)

    match_ids = []
    for prop in qs:
        
        prop_loc = _clean(prop.localidad) + " " + _clean(prop.ubicacion)
        prop_bar = _clean(prop.barrio) + " " + _clean(prop.ubicacion)

        if loc_pref and loc_pref not in prop_loc:
            continue
        if bar_pref and bar_pref not in prop_bar:
            continue

        match_ids.append(prop.id)

    return Propiedad.objects.filter(id__in=match_ids).order_by('-fecha_alta')[:top_n]


def calcular_leads_interesados(propiedad, top_n=20):
    from .models import Contacto

    if propiedad.estado != "disponible":
        return Contacto.objects.none()

    candidatos = Contacto.objects.filter(
        owner=propiedad.owner,
        preferencia__isnull=False,
    ).select_related("preferencia")

    ids_match = []
    
    prop_loc = _clean(propiedad.localidad) + " " + _clean(propiedad.ubicacion)
    prop_bar = _clean(propiedad.barrio) + " " + _clean(propiedad.ubicacion)

    for contacto in candidatos:
        pref = contacto.preferencia

        if pref.tipo_de_propiedad and pref.tipo_de_propiedad != propiedad.tipo_de_propiedad:
            continue

        loc_pref = _clean(pref.localidad)
        if loc_pref and loc_pref not in prop_loc:
            continue

        bar_pref = _clean(pref.barrio)
        if bar_pref and bar_pref not in prop_bar:
            continue

        if pref.presupuesto_min or pref.presupuesto_max:
            if pref.moneda != propiedad.moneda:
                continue
            precio = _to_decimal(propiedad.precio)
            p_min = _to_decimal(pref.presupuesto_min)
            p_max = _to_decimal(pref.presupuesto_max)
            if p_min and precio is not None and precio < p_min:
                continue
            if p_max and precio is not None and precio > p_max:
                continue

        if pref.ambientes_min and propiedad.ambiente < pref.ambientes_min:
            continue

        ids_match.append(contacto.id)
        if len(ids_match) >= top_n:
            break

    return Contacto.objects.filter(id__in=ids_match)