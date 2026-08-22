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

def _pref_matches_propiedad(pref, propiedad):
    
    if pref.tipo_de_propiedad and pref.tipo_de_propiedad != propiedad.tipo_de_propiedad:
        return False

    if pref.operacion and _clean(pref.operacion) != _clean(propiedad.disponibilidad):
        return False

    prop_loc = _clean(propiedad.localidad) + " " + _clean(propiedad.ubicacion)
    prop_bar = _clean(propiedad.barrio) + " " + _clean(propiedad.ubicacion)

    loc_pref = _clean(pref.localidad)
    if loc_pref and loc_pref not in prop_loc:
        return False

    bar_pref = _clean(pref.barrio)
    if bar_pref and bar_pref not in prop_bar:
        return False

    if pref.presupuesto_min or pref.presupuesto_max:
        if pref.moneda != propiedad.moneda:
            return False
        precio = _to_decimal(propiedad.precio)
        p_min = _to_decimal(pref.presupuesto_min)
        p_max = _to_decimal(pref.presupuesto_max)
        if p_min and precio is not None and precio < p_min:
            return False
        if p_max and precio is not None and precio > p_max:
            return False

    if pref.ambientes_min and propiedad.ambiente < pref.ambientes_min:
        return False

    return True


def calcular_matches(contacto, top_n=10):
   
    prefs = list(contacto.preferencias.all())
    if not prefs:
        return Propiedad.objects.none()

    candidatas = Propiedad.objects.filter(
        owner=contacto.owner,
        estado="disponible",
    )

    match_ids = []
    vistos = set()
    for prop in candidatas:
        if prop.id in vistos:
            continue
        if any(_pref_matches_propiedad(pref, prop) for pref in prefs):
            match_ids.append(prop.id)
            vistos.add(prop.id)

    return Propiedad.objects.filter(id__in=match_ids).order_by('-fecha_alta')[:top_n]


def calcular_leads_interesados(propiedad, top_n=20):
    
    from .models import Contacto

    if propiedad.estado != "disponible":
        return Contacto.objects.none()

    candidatos = (
        Contacto.objects.filter(owner=propiedad.owner, preferencias__isnull=False)
        .distinct()
        .prefetch_related("preferencias")
    )

    ids_match = []
    for contacto in candidatos:
        prefs = contacto.preferencias.all()
        if any(_pref_matches_propiedad(pref, propiedad) for pref in prefs):
            ids_match.append(contacto.id)
            if len(ids_match) >= top_n:
                break

    return Contacto.objects.filter(id__in=ids_match)
