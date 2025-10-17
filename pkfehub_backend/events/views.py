from rest_framework import viewsets, filters
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from .models import Event
from .serializers import EventSerializer


class EventPagination(PageNumberPagination):
    page_size = 3
    page_size_query_param = "page_size"
    max_page_size = 100


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    pagination_class = EventPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "description"]

    def get_queryset(self):
        queryset = super().get_queryset()
        status = self.request.query_params.get("status")
        upcoming = self.request.query_params.get("upcoming")
        if upcoming == "true":
            queryset = queryset.filter(start_time__gte=timezone.now(), is_active=True)
        elif status == "active":
            queryset = queryset.filter(is_active=True)
        elif status == "inactive":
            queryset = queryset.filter(is_active=False)
        queryset = queryset.order_by("start_time")
        return queryset
