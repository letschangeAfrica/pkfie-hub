from rest_framework import viewsets, permissions, filters
from rest_framework.response import Response
from .models import Announcement, AnnouncementView
from .serializers import AnnouncementSerializer, AnnouncementViewSerializer
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination


class AnnouncementPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all().order_by("-created_at")
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AnnouncementPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "content", "priority"]
    ordering_fields = ["created_at", "end_date", "priority", "title"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = Announcement.objects.all()
        status_param = self.request.query_params.get("status")
        if status_param == "active":
            qs = qs.filter(is_active=True, end_date__gte=timezone.now())
        elif status_param == "inactive":
            qs = qs.filter(is_active=False)
        elif status_param == "expired":
            qs = qs.filter(end_date__lt=timezone.now())

        # DRF's OrderingFilter will handle ?ordering=..., but keep this for backward compat:
        ordering = self.request.query_params.get("ordering")
        if ordering:
            qs = qs.order_by(*[o.strip() for o in ordering.split(",")])
        else:
            qs = qs.order_by("-created_at")
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        status_val = request.data.get("status")
        if status_val in ("active", "inactive"):
            announcement = self.get_object()
            announcement.is_active = status_val == "active"
            announcement.save()
            serializer = self.get_serializer(announcement)
            return Response(serializer.data)
        return super().partial_update(request, *args, **kwargs)


class AnnouncementViewViewSet(viewsets.ModelViewSet):
    queryset = AnnouncementView.objects.all()
    serializer_class = AnnouncementViewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
