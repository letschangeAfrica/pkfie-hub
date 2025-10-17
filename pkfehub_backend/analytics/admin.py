from django.contrib import admin
from .models import AdminAction, SystemSetting, AuditLog, UsageStatistics


class AdminActionAdmin(admin.ModelAdmin):
    list_display = ("admin", "action_type", "target_type", "performed_at")
    list_filter = ("action_type", "target_type", "performed_at")
    search_fields = ("admin__email", "action_type", "target_type")
    readonly_fields = ("performed_at",)
    date_hierarchy = "performed_at"


class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ("setting_key", "data_type", "is_public", "created_at")
    list_filter = ("data_type", "is_public")
    search_fields = ("setting_key", "description")
    readonly_fields = ("created_at", "updated_at")


class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "resource_type", "created_at")
    list_filter = ("action", "resource_type", "created_at")
    search_fields = ("user__email", "action", "resource_type")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"


class UsageStatisticsAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "total_users",
        "active_users",
        "total_messages",
        "total_document_views",
    )
    readonly_fields = ("created_at",)
    date_hierarchy = "date"


admin.site.register(AdminAction, AdminActionAdmin)
admin.site.register(SystemSetting, SystemSettingAdmin)
admin.site.register(AuditLog, AuditLogAdmin)
admin.site.register(UsageStatistics, UsageStatisticsAdmin)
