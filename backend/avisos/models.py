from django.db import models
from django.conf import settings 

class Aviso(models.Model):
    ESTADOS = [
        ("pendiente", "Pendiente"),
        ("completado", "Completado"),
        ("atrasado", "Atrasado"),
    ]

    
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="avisos",
        null=True, 
        blank=True
    )
    

    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    fecha = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default="pendiente")
    email_enviado = models.BooleanField(
        default=False,
        help_text="Evita mandar el recordatorio diario más de una vez para el mismo aviso.",
    )
    

    evento = models.ForeignKey("leads.Evento", on_delete=models.CASCADE, null=True, blank=True, related_name="aviso")
    
    lead = models.ForeignKey("leads.Contacto", on_delete=models.CASCADE, null=True, blank=True)
    propiedad = models.ForeignKey("propiedades.Propiedad", on_delete=models.CASCADE, null=True, blank=True)

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.titulo} ({self.estado})"