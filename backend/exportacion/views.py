import csv
import io
from datetime import datetime
from decimal import Decimal, InvalidOperation
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.utils.timezone import make_aware
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.db.models import Q, Count
from leads.models import Contacto, Evento
from propiedades.models import Propiedad



def _month_range(year: int, month: int):
    from calendar import monthrange
    start = datetime(year, month, 1, 0, 0, 0)
    last_day = monthrange(year, month)[1]
    end = datetime(year, month, last_day, 23, 59, 59)
    return start, end


def _to_aware(dt: datetime | None):
    if not dt:
        return None
    return make_aware(dt) if dt.tzinfo is None else dt


def _parse_dt(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return _to_aware(val)
    
    for fmt in (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            dt = datetime.strptime(str(val), fmt)
            return _to_aware(dt)
        except Exception:
            continue
   
    try:
        dt = datetime.fromisoformat(str(val))
        return _to_aware(dt)
    except Exception:
        return None


def _to_decimal(x):
    if x is None or x == "":
        return None
    try:
        return Decimal(str(x))
    except (InvalidOperation, ValueError):
        return None




class ExportView(APIView):
    
    permission_classes = [IsAuthenticated]

    def post(self, request):
        fmt = (request.data.get("format") or "csv").lower()
        resources = request.data.get("resources") or []
        filters = request.data.get("filters") or {}

        year = filters.get("year")
        month = filters.get("month")
        date_from = filters.get("date_from")
        date_to = filters.get("date_to")
        estado_propiedad = filters.get("estado_propiedad")


        start_dt = end_dt = None
        if year and month:
            start_dt, end_dt = _month_range(int(year), int(month))
        elif date_from and date_to:
            start_dt = _parse_dt(date_from)
            end_dt = _parse_dt(date_to)

      
        start_dt = _to_aware(start_dt)
        end_dt = _to_aware(end_dt)

        user = request.user


        qs_contactos = Contacto.objects.filter(owner=user)
        if start_dt and end_dt:
            qs_contactos = qs_contactos.filter(creado_en__range=(start_dt, end_dt))

        qs_prop = Propiedad.objects.filter(owner=user)
        if estado_propiedad:
            qs_prop = qs_prop.filter(estado__in=estado_propiedad)
        if start_dt and end_dt:
            qs_prop = qs_prop.filter(fecha_alta__range=(start_dt, end_dt))

        qs_eventos = Evento.objects.filter(owner=user)
        if start_dt and end_dt:
            qs_eventos = qs_eventos.filter(fecha_hora__range=(start_dt, end_dt))

        data = {}
        if "leads" in resources:
            data["leads"] = list(
                qs_contactos.values(
                    "id", "nombre", "apellido", "email", "telefono",
                    "estado__fase", "creado_en",
                )
            )
        if "propiedades" in resources:
            data["propiedades"] = list(
                qs_prop.values(
                    "id", "codigo", "titulo", "ubicacion", "tipo_de_propiedad",
                    "disponibilidad", "precio", "moneda", "ambiente", "antiguedad",
                    "banos", "superficie", "estado", "fecha_alta", "vendida_en",
                )
            )
        if "eventos" in resources:
            data["eventos"] = list(
                qs_eventos.values(
                    "id", "tipo", "fecha_hora", "propiedad_id", "contacto_id",
                    "email", "nombre", "apellido"
                )
            )

       
        if fmt == "json":
            return JsonResponse(data, safe=False)

        buffer = io.StringIO()
        writer = csv.writer(buffer)

        for key in resources:
            rows = data.get(key, [])
            if not rows:
                continue
            writer.writerow([f"=== {key.upper()} ==="])
            headers = list(rows[0].keys())
            writer.writerow(headers)
            for r in rows:
                writer.writerow([r.get(h, "") for h in headers])
            writer.writerow([])

        resp = HttpResponse(buffer.getvalue(), content_type="text/csv")
        filename = "export.csv"
        if year and month:
            filename = f"export_{int(year):04d}_{int(month):02d}.csv"
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp

class ChartMetricsView(APIView):
    

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        year = request.GET.get("year")
        month = request.GET.get("month")
        date_filter_prop = Q()
        date_filter_evt = Q()
        period = None
        if year and month:
            try:
                start_dt, end_dt = _month_range(int(year), int(month))
                start_dt, end_dt = _to_aware(start_dt), _to_aware(end_dt)
                date_filter_prop = Q(fecha_alta__range=(start_dt, end_dt))
                date_filter_evt = Q(eventos__fecha_hora__range=(start_dt, end_dt))
                period = {"year": int(year), "month": int(month)}
            except (TypeError, ValueError):
                return JsonResponse({"detail": "year y month deben ser numéricos"}, status=400)

        qs_leads = Contacto.objects.filter(owner=user)

        if period:
            qs_leads = qs_leads.filter(creado_en__range=(start_dt, end_dt))

    
        leads_por_estado = list(
            qs_leads.values("estado__fase")
            .annotate(total=Count("id"))
            .order_by("-total")
        )
        
        leads_por_estado = list(
            Contacto.objects.filter(owner=user)
            .values("estado__fase")
            .annotate(total=Count("id"))
            .order_by("-total")
        )
        leads_por_estado = [
            {"estado": r["estado__fase"] or "Sin estado", "total": r["total"]}
            for r in leads_por_estado
        ]
        leads_vendidos = next(
            (r["total"] for r in leads_por_estado if r["estado"] == "Vendido"), 0
        )

        propiedades_vendidas = Propiedad.objects.filter(
            owner=user, estado="vendido"
        ).filter(date_filter_prop).count()
        propiedades_alquiladas = Propiedad.objects.filter(
            owner=user, estado="alquilado"
        ).filter(date_filter_prop).count()

        def _top_propiedades(disponibilidad, limit=5):
            qs = (
                Propiedad.objects.filter(owner=user, disponibilidad__iexact=disponibilidad)
                .annotate(
                    total_eventos=Count(
                        "eventos", filter=date_filter_evt, distinct=True
                    )
                )
                .filter(total_eventos__gt=0)
                .order_by("-total_eventos")[:limit]
            )
            return [
                {
                    "id": p.id,
                    "codigo": p.codigo,
                    "titulo": p.titulo,
                    "total_eventos": p.total_eventos,
                }
                for p in qs
            ]

        top_venta = _top_propiedades("venta")
        top_alquiler = _top_propiedades("alquiler")

        return JsonResponse({
            "period": period,
            "leads_por_estado": leads_por_estado,
            "leads_vendidos": leads_vendidos,
            "propiedades_vendidas": propiedades_vendidas,
            "propiedades_alquiladas": propiedades_alquiladas,
            "top_propiedades_venta": top_venta,
            "top_propiedades_alquiler": top_alquiler,
        })

class MetricsView(APIView):
    
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            year = int(request.GET.get("year"))
            month = int(request.GET.get("month"))
        except (TypeError, ValueError):
            return JsonResponse({"detail": "Parámetros year y month son obligatorios"}, status=400)

        start_dt, end_dt = _month_range(year, month)
        start_dt = _to_aware(start_dt)
        end_dt = _to_aware(end_dt)

        user = request.user

       
        ventas_qs = Propiedad.objects.filter(owner=user, estado="vendido")
        ventas_mes = Propiedad.objects.filter(
            owner=user, 
            estado__in=["vendido", "alquilado"] 
        ).filter(
            Q(vendida_en__range=(start_dt, end_dt)) | 
            Q(vendida_en__isnull=True, fecha_alta__range=(start_dt, end_dt))
        ).count()
        if ventas_mes == 0:
            ventas_mes = ventas_qs.filter(fecha_alta__range=(start_dt, end_dt)).count()

    
        propiedades_mes = Propiedad.objects.filter(owner=user, fecha_alta__range=(start_dt, end_dt)).count()

      
        eventos_mes = Evento.objects.filter(owner=user, fecha_hora__range=(start_dt, end_dt)).count()

        
        leads_pendientes = Contacto.objects.filter(owner=user).exclude(
            estado__fase__in=['Vendido', 'Rechazado', 'Lead Vendido', 'Lead Rechazado']
        ).count()

        return JsonResponse({
            "year": year,
            "month": month,
            "ventas_mes": ventas_mes,
            "propiedades_mes": propiedades_mes,
            "eventos_mes": eventos_mes,
            "leads_pendientes": leads_pendientes,
        })
    




class ImportView(APIView):
    
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request):
        user = request.user

        
        resource = (request.data.get("resource") or "").strip().lower()
        dry_run = str(request.data.get("dry_run") or "false").lower() in ("1", "true", "yes")

        if not resource or resource not in ("leads", "propiedades", "eventos"):
            return JsonResponse({"detail": "Parámetro 'resource' inválido."}, status=400)

        rows = None
        file_obj = request.FILES.get("file")

        if file_obj:
            # CSV o JSON subido como archivo
            name = (file_obj.name or "").lower()
            content = file_obj.read()
           
            try:
                text = content.decode("utf-8-sig")
            except UnicodeDecodeError:
                try:
                    text = content.decode("latin-1")
                except Exception:
                    return JsonResponse({"detail": "No se pudo decodificar el archivo."}, status=400)

            if name.endswith(".json"):
                import json
                try:
                    rows = json.loads(text)
                except Exception as e:
                    return JsonResponse({"detail": f"JSON inválido: {e}"}, status=400)
                if not isinstance(rows, list):
                    return JsonResponse({"detail": "El JSON debe ser una lista de objetos."}, status=400)
            else:
                   
                    lines = text.splitlines()
                    target_section = f"=== {resource.upper()} ==="
                    section_lines = []
                    in_section = False
                    
                    
                    if not any(l.startswith("===") for l in lines):
                        section_lines = lines
                    else:
                        for line in lines:
                            line_strip = line.strip()
                            if line_strip == target_section:
                                in_section = True
                                continue
                            elif in_section and line_strip.startswith("==="):
                                break
                            
                            if in_section and line_strip:
                                section_lines.append(line)

                    if not section_lines:
                        return JsonResponse({"detail": f"No se encontró información para el recurso '{resource}' en el CSV."}, status=400)

                    buff = io.StringIO("\n".join(section_lines))
                    reader = csv.DictReader(buff)
                    rows = list(reader)
        else:
            
            rows = request.data.get("rows")
            if not isinstance(rows, list):
                return JsonResponse({"detail": "Debe enviar 'file' (CSV/JSON) o 'rows' (lista JSON)."}, status=400)

        created = 0
        updated = 0
        errors = []

        with transaction.atomic():
            for idx, raw in enumerate(rows, start=1):
                try:
                    if resource == "leads":
                        was_created, was_updated = self._upsert_contacto(user, raw)
                    elif resource == "propiedades":
                        was_created, was_updated = self._upsert_propiedad(user, raw)
                    else:
                        was_created, was_updated = self._upsert_evento(user, raw)

                    created += int(was_created)
                    updated += int(was_updated)
                except Exception as e:
                    errors.append({"row": idx, "error": str(e)})

            if dry_run:
                
                transaction.set_rollback(True)

        return JsonResponse({
            "resource": resource,
            "dry_run": dry_run,
            "created": created,
            "updated": updated,
            "errors": errors,
        }, status=200 if not errors else 207)

    

    def _upsert_contacto(self, user, raw: dict):
        email = (raw.get("email") or "").strip()
        if not email:
            raise ValueError("Contacto requiere 'email' como clave.")

        nombre = (raw.get("nombre") or "").strip()
        apellido = (raw.get("apellido") or "").strip()
        telefono = (raw.get("telefono") or "").strip()
        creado_en = _parse_dt(raw.get("creado_en"))

       
        estado_fase = (raw.get("estado_fase") or raw.get("estado") or "").strip() or None
        estado_obj = None
        if estado_fase:
            from leads.models import EstadoLead
            estado_obj = EstadoLead.objects.filter(fase__iexact=estado_fase).first()

        obj, created = Contacto.objects.get_or_create(
            owner=user, email__iexact=email,
            defaults={"owner": user, "email": email}
        )

        
        if not created and obj.email.lower() != email.lower():
            obj = Contacto.objects.filter(owner=user, email__iexact=email).first()

        before = (obj.nombre, obj.apellido, obj.telefono, obj.estado_id, obj.creado_en)
        if nombre:
            obj.nombre = nombre
        if apellido:
            obj.apellido = apellido
        if telefono:
            obj.telefono = telefono
        if estado_obj:
            obj.estado = estado_obj
        if creado_en:
            obj.creado_en = creado_en
        obj.owner = user
        obj.save()

        after = (obj.nombre, obj.apellido, obj.telefono, obj.estado_id, obj.creado_en)
        updated = (not created) and (before != after)
        return created, updated

    def _upsert_propiedad(self, user, raw: dict):
        codigo = (raw.get("codigo") or "").strip()
        if not codigo:
            raise ValueError("Propiedad requiere 'codigo' como clave.")

        defaults = {"owner": user}
        
        for key in ("titulo", "descripcion", "ubicacion", "tipo_de_propiedad",
                    "disponibilidad", "moneda", "estado"):
            val = raw.get(key)
            if val is not None and val != "":
                defaults[key] = val

  
        precio = _to_decimal(raw.get("precio"))
        if precio is not None:
            defaults["precio"] = precio

        for int_field in ("ambiente", "antiguedad", "banos"):
            v = raw.get(int_field)
            try:
                if v not in (None, ""):
                    defaults[int_field] = int(v)
            except Exception:
                pass

       
        superficie = _to_decimal(raw.get("superficie"))
        if superficie is not None:
            defaults["superficie"] = superficie

       
        fecha_alta = _parse_dt(raw.get("fecha_alta"))
        if fecha_alta:
            defaults["fecha_alta"] = fecha_alta
        vendida_en = _parse_dt(raw.get("vendida_en"))
        if vendida_en:
            defaults["vendida_en"] = vendida_en

        obj, created = Propiedad.objects.get_or_create(
            owner=user, codigo=codigo, defaults=defaults
        )

        if not created:
            changed = False
            for k, v in defaults.items():
                if getattr(obj, k) != v and v is not None:
                    setattr(obj, k, v)
                    changed = True
            if changed:
                obj.save()
            return False, changed
        return True, False

    def _upsert_evento(self, user, raw: dict):
        tipo = (raw.get("tipo") or "").strip()
        if not tipo:
            raise ValueError("Evento requiere 'tipo'.")

        fecha_hora = _parse_dt(raw.get("fecha_hora"))
        if not fecha_hora:
            raise ValueError("Evento requiere 'fecha_hora' válida.")

       
        prop = None
        prop_id = raw.get("propiedad_id")
        prop_codigo = raw.get("propiedad_codigo")
        if prop_id:
            prop = Propiedad.objects.filter(owner=user, id=prop_id).first()
        if not prop and prop_codigo:
            prop = Propiedad.objects.filter(owner=user, codigo=prop_codigo).first()
        if not prop:
            raise ValueError("No se encontró la propiedad (propiedad_id o propiedad_codigo).")

       
        ct = None
        contacto_id = raw.get("contacto_id")
        contacto_email = (raw.get("contacto_email") or "").strip()
        if contacto_id:
            ct = Contacto.objects.filter(owner=user, id=contacto_id).first()
        if not ct and contacto_email:
            ct = Contacto.objects.filter(owner=user, email__iexact=contacto_email).first()

        nombre = (raw.get("nombre") or "").strip()
        apellido = (raw.get("apellido") or "").strip()
        email = (raw.get("email") or "").strip()
        notas = (raw.get("notas") or "").strip()

      
        ev_id = raw.get("id")
        if ev_id:
            ev = Evento.objects.filter(owner=user, id=ev_id).first()
            if not ev:
               
                ev = Evento.objects.create(
                    owner=user, tipo=tipo, fecha_hora=fecha_hora,
                    propiedad=prop, contacto=ct, nombre=nombre, apellido=apellido,
                    email=email or None, notas=notas
                )
                return True, False
            before = (ev.tipo, ev.fecha_hora, ev.propiedad_id, ev.contacto_id, ev.nombre, ev.apellido, ev.email, ev.notas)
            ev.tipo = tipo
            ev.fecha_hora = fecha_hora
            ev.propiedad = prop
            ev.contacto = ct
            if nombre: ev.nombre = nombre
            if apellido: ev.apellido = apellido
            ev.email = email or None
            if notas: ev.notas = notas
            ev.owner = user
            ev.save()
            after = (ev.tipo, ev.fecha_hora, ev.propiedad_id, ev.contacto_id, ev.nombre, ev.apellido, ev.email, ev.notas)
            return False, before != after

   
        Evento.objects.create(
            owner=user, tipo=tipo, fecha_hora=fecha_hora,
            propiedad=prop, contacto=ct, nombre=nombre, apellido=apellido,
            email=email or None, notas=notas
        )
        return True, False

