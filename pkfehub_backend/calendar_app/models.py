from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

User = get_user_model()


class CalendarEvent(models.Model):
    EVENT_TYPE_CHOICES = (
        ("academic", "Academic"),
        ("social", "Social"),
        ("career", "Career"),
        ("workshop", "Workshop"),
        ("personal", "Personal"),
        ("deadline", "Deadline"),
        ("holiday", "Holiday"),
        ("meeting", "Meeting"),
        ("announcement", "Announcement"),
        ("institutional", "Institutional"),
    )

    PRIORITY_CHOICES = (
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    )

    SOURCE_CHOICES = (
        ("personal", "Personal"),
        ("events_app", "Events App"),
        ("announcements_app", "Announcements App"),
        ("system", "System"),
    )

    # Basic event info
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    event_type = models.CharField(
        max_length=20, choices=EVENT_TYPE_CHOICES, default="personal"
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    location = models.CharField(max_length=200, blank=True, null=True)
    organizer = models.CharField(max_length=200, blank=True, null=True)

    # User association
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="calendar_events",
        blank=True,
        null=True,
    )

    # Event details
    is_all_day = models.BooleanField(default=False)
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default="medium"
    )
    color = models.CharField(max_length=7, default="#3B82F6")

    # Recurrence
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(max_length=200, blank=True, null=True)

    # Source tracking for automatic events
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="personal")
    source_id = models.IntegerField(blank=True, null=True)  # ID from original object
    source_data = models.JSONField(blank=True, null=True)  # Store original data

    # Visibility and status
    is_public = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_time"]
        verbose_name = "Calendar Event"
        verbose_name_plural = "Calendar Events"
        indexes = [
            models.Index(fields=["start_time", "end_time"]),
            models.Index(fields=["user", "start_time"]),
            models.Index(fields=["is_public", "start_time"]),
            models.Index(fields=["source", "source_id"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.start_time:%Y-%m-%d %H:%M})"

    @property
    def is_auto_generated(self):
        return self.source != "personal"

    def get_original_object(self):
        """Get the original object that generated this calendar event"""
        if self.source == "events_app" and self.source_id:
            try:
                from events.models import Event

                return Event.objects.get(id=self.source_id)
            except ImportError:
                return None
        elif self.source == "announcements_app" and self.source_id:
            try:
                from announcements.models import Announcement

                return Announcement.objects.get(id=self.source_id)
            except ImportError:
                return None
        return None


class EventReminder(models.Model):
    REMINDER_UNIT_CHOICES = (
        ("minutes", "Minutes"),
        ("hours", "Hours"),
        ("days", "Days"),
        ("weeks", "Weeks"),
    )

    event = models.ForeignKey(
        CalendarEvent, on_delete=models.CASCADE, related_name="reminders"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    reminder_time = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10080)]
    )
    reminder_unit = models.CharField(
        max_length=10, choices=REMINDER_UNIT_CHOICES, default="minutes"
    )
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["reminder_time"]
        verbose_name = "Event Reminder"
        verbose_name_plural = "Event Reminders"

    def __str__(self):
        return f"Reminder for {self.event.title} - {self.reminder_time} {self.reminder_unit} before"

    def calculate_reminder_time(self):
        """Calculate the actual datetime for the reminder"""
        reminder_delta = timezone.timedelta()
        if self.reminder_unit == "minutes":
            reminder_delta = timezone.timedelta(minutes=self.reminder_time)
        elif self.reminder_unit == "hours":
            reminder_delta = timezone.timedelta(hours=self.reminder_time)
        elif self.reminder_unit == "days":
            reminder_delta = timezone.timedelta(days=self.reminder_time)
        elif self.reminder_unit == "weeks":
            reminder_delta = timezone.timedelta(weeks=self.reminder_time)

        return self.event.start_time - reminder_delta


class CalendarSubscription(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="calendar_subscriptions"
    )
    name = models.CharField(max_length=100)
    url = models.URLField(blank=True, null=True)
    color = models.CharField(max_length=7, default="#6B7280")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Calendar Subscription"
        verbose_name_plural = "Calendar Subscriptions"

    def __str__(self):
        return f"{self.user.username} - {self.name}"
