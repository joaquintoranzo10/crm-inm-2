import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.templatetags.static import static
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _get_logo_url() -> str:
    
    backend_url = getattr(settings, "BACKEND_URL", "http://localhost:8000").rstrip("/")
    return backend_url + static("emails/img/logo.png")


def _send_branded_email(subject: str, to_email: str, template_name: str, context: dict) -> bool:
   
    context.setdefault("logo_url", _get_logo_url())
    try:
        html_message = render_to_string(template_name, context)
        plain_message = strip_tags(html_message)

        email = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        email.attach_alternative(html_message, "text/html")
        email.send(fail_silently=True)
        return True

    except Exception as exc:
        logger.error(f"[EMAIL] Error al enviar '{subject}' a {to_email}: {exc}", exc_info=True)
        return False


def send_reset_password_email(user_email: str, reset_url: str, nombre: str) -> bool:
    subject = "Restablecer contraseña — Real Connect"
    context = {
        "nombre": nombre or "Usuario",
        "email": user_email,
        "reset_url": reset_url,
        "accent_color": "#1a56db",
        "accent_soft": "#eff6ff",
        "accent_border": "#bfdbfe",
        "accent_dark": "#1e429f",
        "accent_chip": "#dbeafe",
    }
    ok = _send_branded_email(subject, user_email, "emails/reset_password.html", context)
    if ok:
        logger.info(f"[EMAIL] Reset-password enviado a: {user_email}")
    return ok


def send_aviso_email(user_email: str, nombre: str, aviso_data: dict) -> bool:
    subject = f"Nuevo aviso: {aviso_data.get('titulo', 'Aviso pendiente')} — Real Connect"
    context = {
        "nombre": nombre or "Usuario",
        "titulo": aviso_data.get("titulo", "Sin título"),
        "descripcion": aviso_data.get("descripcion", ""),
        "fecha": aviso_data.get("fecha", ""),
        "lead_nombre": aviso_data.get("lead_nombre", ""),
        "crm_url": getattr(settings, "FRONTEND_URL", "http://localhost:5173") + "/avisos",
        "accent_color": "#059669",
        "accent_soft": "#f0fdf4",
        "accent_border": "#bbf7d0",
        "accent_dark": "#065f46",
        "accent_chip": "#d1fae5",
    }
    ok = _send_branded_email(subject, user_email, "emails/notificacion_aviso.html", context)
    if ok:
        logger.info(f"[EMAIL] Notificación de aviso enviada a: {user_email} — '{aviso_data.get('titulo')}'")
    return ok


_TIPO_META = {
    "reunion": {"emoji": "🤝", "css": "reunion", "color": "#7c3aed", "soft": "#f5f3ff", "border": "#ede9fe", "dark": "#6d28d9", "chip": "#ede9fe"},
    "visita":  {"emoji": "🏠", "css": "visita",  "color": "#0891b2", "soft": "#ecfeff", "border": "#cffafe", "dark": "#0e7490", "chip": "#cffafe"},
    "llamada": {"emoji": "📞", "css": "llamada", "color": "#d97706", "soft": "#fffbeb", "border": "#fde68a", "dark": "#b45309", "chip": "#fde68a"},
}
_TIPO_DEFAULT = {"emoji": "📅", "css": "default", "color": "#1a56db", "soft": "#eff6ff", "border": "#bfdbfe", "dark": "#1d4ed8", "chip": "#dbeafe"}


def send_evento_email(user_email: str, nombre: str, evento_data: dict) -> bool:
    tipo_raw = evento_data.get("tipo", "")
    meta = _TIPO_META.get(tipo_raw.lower(), _TIPO_DEFAULT)

    subject = f"{meta['emoji']} Nuevo evento: {tipo_raw} — {evento_data.get('fecha_hora', '')} — Real Connect"
    context = {
        "nombre": nombre or "Usuario",
        "tipo": tipo_raw,
        "emoji_tipo": meta["emoji"],
        "fecha_hora": evento_data.get("fecha_hora", ""),
        "propiedad": evento_data.get("propiedad", "Sin especificar"),
        "contacto_nombre": evento_data.get("contacto_nombre", ""),
        "contacto_email": evento_data.get("contacto_email", ""),
        "notas": evento_data.get("notas", ""),
        "crm_url": getattr(settings, "FRONTEND_URL", "http://localhost:5173") + "/app",
        "accent_color": meta["color"],
        "accent_soft": meta["soft"],
        "accent_border": meta["border"],
        "accent_dark": meta["dark"],
        "accent_chip": meta["chip"],
    }
    ok = _send_branded_email(subject, user_email, "emails/notificacion_evento.html", context)
    if ok:
        logger.info(f"[EMAIL] Notificación de evento enviada a: {user_email} — {tipo_raw} el {evento_data.get('fecha_hora')}")
    return ok


def send_recordatorios_email(user_email: str, nombre: str, leads: list) -> bool:
    
    subject = f"Real Connect: Tenés {len(leads)} seguimiento{'s' if len(leads) != 1 else ''} para hoy"
    context = {
        "nombre": nombre or "Usuario",
        "leads": leads,
        "crm_url": getattr(settings, "FRONTEND_URL", "http://localhost:5173") + "/leads",
        "accent_color": "#059669",
        "accent_soft": "#f0fdf4",
        "accent_border": "#bbf7d0",
        "accent_dark": "#065f46",
        "accent_chip": "#d1fae5",
    }
    ok = _send_branded_email(subject, user_email, "emails/notificacion_recordatorios.html", context)
    if ok:
        logger.info(f"[EMAIL] Recordatorio de seguimientos enviado a: {user_email} — {len(leads)} leads")
    return ok
