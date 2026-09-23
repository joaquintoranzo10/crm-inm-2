import csv
import io
import json
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
from rest_framework.response import Response


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
        formato = request.data.get("format", "csv")
        resources = request.data.get("resources", [])
        
        usuario = request.user
        
        datos_exportacion = {}
        
        if "leads" in resources:
            datos_exportacion["leads"] = list(Contacto.objects.filter(owner=usuario).values(
                "id", "nombre", "apellido", "email", "telefono", "estado__fase", "creado_en"
            ))
            
        if "propiedades" in resources:
            datos_exportacion["propiedades"] = list(Propiedad.objects.filter(owner=usuario).values(
                "codigo", "titulo", "tipo_de_propiedad", "disponibilidad", "precio", "moneda", "estado"
            ))

        #  Genera JSON
        if formato == "json":
            
            response = HttpResponse(json.dumps(datos_exportacion, default=str), content_type="application/json")
            response["Content-Disposition"] = 'attachment; filename="export.json"'
            return response
            
        #  Genera CSV 
        elif formato == "csv":
            response = HttpResponse(content_type="text/csv; charset=utf-8")
            response["Content-Disposition"] = 'attachment; filename="export.csv"'
            writer = csv.writer(response)
            
            for recurso, filas in datos_exportacion.items():
                writer.writerow([f"--- RECURSO: {recurso.upper()} ---"])
                if filas:
                    
                    writer.writerow(filas[0].keys())
                    
                    for fila in filas:
                        writer.writerow(fila.values())
                writer.writerow([]) 
                
            return response

        return Response({"detail": "Formato no válido"}, status=400)

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
        
        leads_por_estado_formatted = [
            {"estado": r["estado__fase"] or "Sin estado", "total": r["total"]}
            for r in leads_por_estado
        ]

        def get_lead_count(fase):
            return next((r["total"] for r in leads_por_estado_formatted if r["estado"].lower() == fase.lower()), 0)

        leads_totales = sum(r["total"] for r in leads_por_estado_formatted)
        leads_vendidos = get_lead_count("Vendido")
        leads_nuevos = get_lead_count("Nuevo")
        leads_negociacion = get_lead_count("En negociación")
        leads_rechazados = get_lead_count("Rechazado")

        def count_props(estado, disp=None):
            q = Propiedad.objects.filter(owner=user, estado__iexact=estado)
            if disp:
                q = q.filter(disponibilidad__iexact=disp)
            if period:
                q = q.filter(date_filter_prop)
            return q.count()

        prop_disp_venta = count_props("disponible", "venta")
        prop_disp_alq = count_props("disponible", "alquiler")
        prop_res_venta = count_props("reservado", "venta")
        prop_res_alq = count_props("reservado", "alquiler")
        prop_vendidas = count_props("vendido")
        prop_alquiladas = count_props("alquilado")

        prop_totales = (prop_disp_venta + prop_disp_alq + prop_res_venta + 
                        prop_res_alq + prop_vendidas + prop_alquiladas)

        propiedades_stats = [
            {"estado": "Disp. Venta", "total": prop_disp_venta},
            {"estado": "Disp. Alquiler", "total": prop_disp_alq},
            {"estado": "Res. Venta", "total": prop_res_venta},
            {"estado": "Res. Alquiler", "total": prop_res_alq},
            {"estado": "Vendidas", "total": prop_vendidas},
            {"estado": "Alquiladas", "total": prop_alquiladas},
        ]

       
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
            "leads_por_estado": leads_por_estado_formatted,
            "leads_totales": leads_totales,
            "leads_vendidos": leads_vendidos,
            "leads_nuevos": leads_nuevos,
            "leads_negociacion": leads_negociacion,
            "leads_rechazados": leads_rechazados,
            "propiedades_totales": prop_totales,
            "propiedades_vendidas": prop_vendidas,
            "propiedades_alquiladas": prop_alquiladas,
            "propiedades_stats": propiedades_stats,
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

    def post(self, request):
        resource = request.data.get("resource", "leads")
        dry_run = request.data.get("dry_run") == "true"
        file_obj = request.FILES.get("file")

        if not file_obj:
            return Response({"detail": "Debes adjuntar un archivo."}, status=400)
            
        if resource != "leads":
            return Response({"detail": "Por ahora solo se soporta la importación de Leads."}, status=400)

        # Manejo seguro de la codificación (UTF-8, pero evitamos crasheos)
        try:
            decoded_file = file_obj.read().decode('utf-8-sig') # utf-8-sig quita el BOM de Excel
        except UnicodeDecodeError:
            return Response({"detail": "El archivo debe estar codificado en UTF-8. Guardalo nuevamente desde Excel como 'CSV UTF-8'."}, status=400)

        created_count = 0
        errores = []

        
        try:
            with transaction.atomic():
                reader = csv.DictReader(io.StringIO(decoded_file))
                
                # Normalizamos las cabeceras a minúsculas para evitar errores si el usuario escribe "Nombre" o "NOMBRE"
                reader.fieldnames = [name.strip().lower() for name in reader.fieldnames if name]

                for row_idx, row in enumerate(reader, start=2): # Start 2 por la cabecera
                    # Usamos .get() con fallback vacío para que no tire KeyError si falta la columna
                    nombre = row.get("nombre", "").strip()
                    email = row.get("email", "").strip()
                    apellido = row.get("apellido", "").strip()
                    telefono = row.get("telefono", "").strip()

                    # Necesita al menos nombre o email
                    if not nombre and not email:
                        errores.append({"row": row_idx, "error": "Falta proveer nombre o email."})
                        continue

                    # Creamos el contacto asociado estrictamente al usuario actual
                    Contacto.objects.create(
                        owner=request.user,
                        nombre=nombre,
                        apellido=apellido,
                        email=email if email else None,
                        telefono=telefono
                    )
                    created_count += 1

                # Si es un simulacro o si hubo errores en la subida, cancelamos TODO lo que se guardó.
                if dry_run or errores:
                    transaction.set_rollback(True)

        except csv.Error:
            return Response({"detail": "El formato del CSV es inválido. Verificá que las columnas estén separadas por comas."}, status=400)
        except Exception as e:
            return Response({"detail": f"Ocurrió un error inesperado al procesar: {str(e)}"}, status=400)

      # Si hubo errores y No prueba , igual fallamos la importación completa para proteger la DB
        if errores and not dry_run:
            return Response({
                "detail": "Se encontraron errores en el archivo. No se importó ningún registro.",
                "errors": errores,
                "created": 0,
                "dry_run": False
            }, status=400)

        # Respuesta exitosa
        return Response({
            "created": created_count,
            "updated": 0,
            "errors": errores,
            "dry_run": dry_run
        })

