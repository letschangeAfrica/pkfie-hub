# notifications/views.py
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import Notification
from .serializers import NotificationSerializer


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NotificationPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "text"]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user).order_by("-created_at")
        unread = self.request.query_params.get("unread")
        notif_type = self.request.query_params.get("notif_type")
        if unread in ("true", "1"):
            qs = qs.filter(read=False)
        if notif_type:
            qs = qs.filter(notif_type=notif_type)
        return qs

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        updated = Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({"marked_read": updated})
