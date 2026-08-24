import logging
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

logger = logging.getLogger(__name__)


def send_reset_password_email(user_email: str, reset_url: str, nombre: str) -> bool:
   
    subject = "Restablecer contraseña — Real Connect"
    context = {
        "nombre": nombre or "Usuario",
        "email": user_email,
        "reset_url": reset_url,
    }
    try:
        html_message = render_to_string("emails/reset_password.html", context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            html_message=html_message,
            fail_silently=True,
        )
        logger.info(f"[EMAIL] Reset-password enviado a: {user_email}")
        return True

    except Exception as exc:
        logger.error(f"[EMAIL] Error al enviar reset-password a {user_email}: {exc}", exc_info=True)
        return False


def send_aviso_email(user_email: str, nombre: str, aviso_data: dict) -> bool:
    
    subject = f" Nuevo aviso: {aviso_data.get('titulo', 'Aviso pendiente')} — Real Connect"
    context = {
        "nombre": nombre or "Usuario",
        "titulo": aviso_data.get("titulo", "Sin título"),
        "descripcion": aviso_data.get("descripcion", ""),
        "fecha": aviso_data.get("fecha", ""),
        "lead_nombre": aviso_data.get("lead_nombre", ""),
        "crm_url": getattr(settings, "FRONTEND_URL", "http://localhost:5173") + "/avisos",
    }
    try:
        html_message = render_to_string("emails/notificacion_aviso.html", context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            html_message=html_message,
            fail_silently=True,
        )
        logger.info(f"[EMAIL] Notificación de aviso enviada a: {user_email} — '{aviso_data.get('titulo')}'")
        return True

    except Exception as exc:
        logger.error(f"[EMAIL] Error al enviar notificación a {user_email}: {exc}", exc_info=True)
        return False


_TIPO_META = {
    "reunion":  {"emoji": "🤝", "css": "reunion"},
    "visita":   {"emoji": "🏠", "css": "visita"},
    "llamada":  {"emoji": "📞", "css": "llamada"},
}


def send_evento_email(user_email: str, nombre: str, evento_data: dict) -> bool:
    
    tipo_raw = evento_data.get("tipo", "")
    tipo_key = tipo_raw.lower()
    meta = _TIPO_META.get(tipo_key, {"emoji": "📅", "css": "default"})

    subject = (
        f"{meta['emoji']} Nuevo evento: {tipo_raw} — "
        f"{evento_data.get('fecha_hora', '')} — Real Connect"
    )
    context = {
        "nombre": nombre or "Usuario",
        "tipo": tipo_raw,
        "tipo_css": meta["css"],
        "emoji_tipo": meta["emoji"],
        "fecha_hora": evento_data.get("fecha_hora", ""),
        "propiedad": evento_data.get("propiedad", "Sin especificar"),
        "contacto_nombre": evento_data.get("contacto_nombre", ""),
        "contacto_email": evento_data.get("contacto_email", ""),
        "notas": evento_data.get("notas", ""),
        "crm_url": getattr(settings, "FRONTEND_URL", "http://localhost:5173") + "/app",
    }
    try:
        html_message = render_to_string("emails/notificacion_evento.html", context)
        plain_message = strip_tags(html_message)
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            html_message=html_message,
            fail_silently=True,
        )
        logger.info(
            f"[EMAIL] Notificación de evento enviada a: {user_email} "
            f"— {tipo_raw} el {evento_data.get('fecha_hora')}"
        )
        return True
    except Exception as exc:
        logger.error(
            f"[EMAIL] Error al enviar notificación de evento a {user_email}: {exc}",
            exc_info=True,
        )
        return False
