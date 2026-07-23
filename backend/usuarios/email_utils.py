
import logging
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

logger = logging.getLogger(__name__)


def send_reset_password_email(user_email: str, reset_url: str, nombre: str) -> bool:
   
    subject = "Restablecer contraseña — CRM Inmobiliaria"
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
            fail_silently=False,
        )
        logger.info(f"[EMAIL] Reset-password enviado a: {user_email}")
        return True

    except Exception as exc:
        logger.error(f"[EMAIL] Error al enviar reset-password a {user_email}: {exc}", exc_info=True)
        return False


def send_aviso_email(user_email: str, nombre: str, aviso_data: dict) -> bool:
    
    subject = f"📋 Nuevo aviso: {aviso_data.get('titulo', 'Aviso pendiente')} — CRM Inmobiliaria"
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
            fail_silently=False,
        )
        logger.info(f"[EMAIL] Notificación de aviso enviada a: {user_email} — '{aviso_data.get('titulo')}'")
        return True

    except Exception as exc:
        logger.error(f"[EMAIL] Error al enviar notificación a {user_email}: {exc}", exc_info=True)
        return False
