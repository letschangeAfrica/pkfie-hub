from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import SystemSetting
from .serializers import SystemSettingSerializer

DEFAULTS = [
    # General
    {"key": "site_name",          "value": "PKFIE-Hub",              "category": "general", "description": "Display name of the platform"},
    {"key": "site_tagline",       "value": "PKFokam Institute of Excellence", "category": "general", "description": "Short tagline shown on the homepage"},
    {"key": "maintenance_mode",   "value": "false",                  "category": "general", "description": "Put the site in maintenance mode (true/false)"},
    {"key": "max_login_attempts", "value": "5",                      "category": "general", "description": "Max failed login attempts before lockout"},
    # AI
    {"key": "ai_enabled",         "value": "true",                   "category": "ai",      "description": "Enable the AI chat assistant"},
    {"key": "ai_default_model",   "value": "claude-sonnet-4-6",      "category": "ai",      "description": "Default Claude model for the assistant"},
    {"key": "ai_max_tokens",      "value": "1024",                   "category": "ai",      "description": "Default max tokens for AI responses"},
    {"key": "ai_temperature",     "value": "0.7",                    "category": "ai",      "description": "Default temperature (0–1) for AI responses"},
    # Files
    {"key": "max_file_size_mb",   "value": "10",                     "category": "files",   "description": "Maximum upload file size in megabytes"},
    {"key": "allowed_file_types", "value": "pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,png,zip", "category": "files", "description": "Comma-separated list of allowed file extensions"},
    # Email
    {"key": "email_from_name",    "value": "PKFIE-Hub",              "category": "email",   "description": "Sender name for outgoing emails"},
    {"key": "email_notifications_enabled", "value": "true",          "category": "email",   "description": "Enable email notifications platform-wide"},
]


class IsStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all().order_by("key")
    serializer_class = SystemSettingSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaff]
    filter_backends = [filters.SearchFilter]
    search_fields = ["key", "value", "description"]
    lookup_field = "key"

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category__iexact=category)
        return qs

    @action(detail=False, methods=["post"])
    def create_defaults(self, request):
        created = []
        for entry in DEFAULTS:
            _, was_created = SystemSetting.objects.get_or_create(
                key=entry["key"],
                defaults={k: v for k, v in entry.items() if k != "key"},
            )
            if was_created:
                created.append(entry["key"])
        return Response({"created": created, "total": len(created)})
