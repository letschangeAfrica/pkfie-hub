from django.contrib import admin
from .models import SystemSetting


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ("key", "category", "value", "updated_at")
    search_fields = ("key", "value", "description")
    list_filter = ("category",)
    ordering = ("key",)
