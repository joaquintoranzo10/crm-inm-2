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


def _normalizar(texto):
    
    if not texto:
        return ""
    texto = str(texto).strip().lower()
    sin_acentos = unicodedata.normalize("NFD", texto)
    return "".join(c for c in sin_acentos if unicodedata.category(c) != "Mn")


def _localidad_barrio_coinciden(pref, propiedad):
    
    if pref.localidad and _normalizar(pref.localidad) not in _normalizar(propiedad.localidad):
        return False
    if pref.barrio and _normalizar(pref.barrio) not in _normalizar(propiedad.barrio):
        return False
    return True


def calcular_matches(contacto, top_n=10):
    
    pref = getattr(contacto, "preferencia", None)
    if pref is None:
        return []


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

    resultado = [p for p in qs if _localidad_barrio_coinciden(pref, p)]
    return resultado[:top_n]


def calcular_leads_interesados(propiedad, top_n=20):
    
    from .models import Contacto  

    if propiedad.estado != "disponible":
        return Contacto.objects.none()

    candidatos = Contacto.objects.filter(
        owner=propiedad.owner,
        preferencia__isnull=False,
    ).select_related("preferencia")

    ids_match = []
    for contacto in candidatos:
        pref = contacto.preferencia

        if pref.tipo_de_propiedad and pref.tipo_de_propiedad != propiedad.tipo_de_propiedad:
            continue

        if not _localidad_barrio_coinciden(pref, propiedad):
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
