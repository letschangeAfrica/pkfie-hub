# notifications/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

NOTIF_TYPE_CHOICES = [
    ("info", "Info"),
    ("message", "Message"),
    ("warning", "Warning"),
    ("error", "Error"),
]


class Notification(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications",
        blank=True, null=True,
    )
    title = models.CharField(max_length=255, blank=True, default="")
    text = models.CharField(max_length=1024)
    notif_type = models.CharField(
        max_length=20, choices=NOTIF_TYPE_CHOICES, default="info"
    )
    link = models.CharField(max_length=1000, blank=True, null=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
