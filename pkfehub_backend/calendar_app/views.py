from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta
from .models import CalendarEvent, EventReminder, CalendarSubscription
from .serializers import (
    CalendarEventSerializer,
    EventReminderSerializer,
    CalendarSubscriptionSerializer,
)


class CalendarEventViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Users can see:
        - Their personal events
        - Public events from all sources (institutional, announcements)
        - Auto-generated events that are active
        """
        user = self.request.user
        queryset = (
            CalendarEvent.objects.filter(
                Q(user=user)
                | Q(is_public=True)
                | Q(source__in=["events_app", "announcements_app"], is_active=True)
            )
            .select_related("user")
            .prefetch_related("reminders")
        )

        # Filter by date range if provided
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date and end_date:
            try:
                start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                queryset = queryset.filter(
                    Q(start_time__range=(start, end))
                    | Q(end_time__range=(start, end))
                    | Q(start_time__lte=start, end_time__gte=end)
                )
            except (ValueError, TypeError):
                pass

        # Filter by event type
        event_type = self.request.query_params.get("event_type")
        if event_type:
            queryset = queryset.filter(event_type=event_type)

        # Filter by source
        source = self.request.query_params.get("source")
        if source:
            queryset = queryset.filter(source=source)

        # Filter by search term
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(location__icontains=search)
            )

        return queryset.order_by("start_time")

    def perform_create(self, serializer):
        """All created events through API are personal"""
        serializer.save(user=self.request.user, source="personal")

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        """
        Get upcoming events for the next 30 days
        """
        today = timezone.now()
        next_month = today + timedelta(days=30)

        events = self.get_queryset().filter(
            start_time__range=(today, next_month), is_active=True
        )[
            :20
        ]  # Limit to 20 events

        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def today(self, request):
        """
        Get events for today
        """
        today = timezone.now().date()
        tomorrow = today + timedelta(days=1)

        events = self.get_queryset().filter(
            Q(start_time__date=today) | Q(is_all_day=True, start_time__date=today)
        )

        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def month(self, request):
        """
        Get events for current month
        """
        today = timezone.now().date()
        first_day = today.replace(day=1)
        next_month = first_day + timedelta(days=32)
        last_day = next_month.replace(day=1) - timedelta(days=1)

        events = self.get_queryset().filter(
            Q(start_time__date__range=(first_day, last_day))
            | Q(end_time__date__range=(first_day, last_day))
            | Q(start_time__date__lte=first_day, end_time__date__gte=last_day)
        )

        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_reminder(self, request, pk=None):
        """
        Add a reminder to an event
        """
        event = self.get_object()
        reminder_data = {"event": event.id, "user": request.user.id, **request.data}

        serializer = EventReminderSerializer(data=reminder_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def sources(self, request):
        """
        Get available event sources
        """
        sources = [
            {"value": "personal", "label": "Personal Events"},
            {"value": "events_app", "label": "Institutional Events"},
            {"value": "announcements_app", "label": "Announcements"},
            {"value": "all", "label": "All Events"},
        ]
        return Response(sources)

    @action(detail=False, methods=["get"])
    def sync_status(self, request):
        """
        Get synchronization status with other apps
        """
        status_info = {
            "total_events": CalendarEvent.objects.count(),
            "personal_events": CalendarEvent.objects.filter(source="personal").count(),
            "institutional_events": CalendarEvent.objects.filter(
                source="events_app"
            ).count(),
            "announcement_events": CalendarEvent.objects.filter(
                source="announcements_app"
            ).count(),
            "last_sync": timezone.now().isoformat(),
        }
        return Response(status_info)


class EventReminderViewSet(viewsets.ModelViewSet):
    serializer_class = EventReminderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EventReminder.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CalendarSubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarSubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CalendarSubscription.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
