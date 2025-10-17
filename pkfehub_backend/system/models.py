from django.db import models


class SystemSetting(models.Model):
    CATEGORY_CHOICES = [
        ("general", "General"),
        ("ai", "AI"),
        ("files", "Files"),
        ("email", "Email"),
    ]

    key = models.CharField(max_length=200, unique=True)
    value = models.TextField(blank=True)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=32, choices=CATEGORY_CHOICES, default="general", db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key} ({self.category})"
