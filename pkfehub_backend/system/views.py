from rest_framework import viewsets, permissions, filters
from .models import SystemSetting
from .serializers import SystemSettingSerializer


class IsStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class SystemSettingViewSet(viewsets.ModelViewSet):
    """
    Expose SystemSetting; writing restricted to staff (IsStaff).
    lookup_field = 'key' already configured in your router / view usage.
    """

    queryset = SystemSetting.objects.all().order_by("key")
    serializer_class = SystemSettingSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaff]
    filter_backends = [filters.SearchFilter]
    search_fields = ["key", "value", "description"]

    lookup_field = "key"

    def get_queryset(self):
        """
        Optionally filter by ?category=ai|general|files|email
        """
        qs = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category__iexact=category)
        return qs
