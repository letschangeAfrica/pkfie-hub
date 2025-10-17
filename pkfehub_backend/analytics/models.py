# analytics/models.py
from django.db import models
from users.models import User


class AdminAction(models.Model):
    admin = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="admin_actions"
    )
    action_type = models.CharField(max_length=100)
    target_type = models.CharField(max_length=100, blank=True, null=True)
    target_id = models.IntegerField(blank=True, null=True)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    performed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "admin_actions"
        verbose_name = "Admin Action"
        verbose_name_plural = "Admin Actions"

    def __str__(self):
        return f"{self.admin.email} - {self.action_type}"


class SystemSetting(models.Model):
    DATA_TYPE_CHOICES = (
        ("string", "String"),
        ("number", "Number"),
        ("boolean", "Boolean"),
        ("json", "JSON"),
    )

    setting_key = models.CharField(max_length=100, unique=True)
    setting_value = models.TextField()
    data_type = models.CharField(
        max_length=50, choices=DATA_TYPE_CHOICES, default="string"
    )
    description = models.TextField(blank=True, null=True)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "system_settings"
        verbose_name = "System Setting"
        verbose_name_plural = "System Settings"

    def __str__(self):
        return self.setting_key


class AuditLog(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=100)
    resource_id = models.IntegerField(blank=True, null=True)
    previous_values = models.JSONField(blank=True, null=True)
    new_values = models.JSONField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"

    def __str__(self):
        return f"{self.action} on {self.resource_type}"


class UsageStatistics(models.Model):
    date = models.DateField(unique=True)
    total_users = models.IntegerField(default=0)
    active_users = models.IntegerField(default=0)
    total_conversations = models.IntegerField(default=0)
    total_messages = models.IntegerField(default=0)
    total_document_views = models.IntegerField(default=0)
    total_pathfinder_completions = models.IntegerField(default=0)
    average_session_duration = models.FloatField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "usage_statistics"
        verbose_name = "Usage Statistics"
        verbose_name_plural = "Usage Statistics"

    def __str__(self):
        return f"Usage stats for {self.date}"
