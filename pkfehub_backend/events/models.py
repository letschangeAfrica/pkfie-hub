from django.db import models
from users.models import User


class Event(models.Model):
    EVENT_TYPE_CHOICES = (
        ("academic", "Academic"),
        ("social", "Social"),
        ("career", "Career"),
        ("workshop", "Workshop"),
        ("webinar", "Webinar"),
        ("conference", "Conference"),
        ("competition", "Competition"),
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    event_type = models.CharField(
        max_length=32, choices=EVENT_TYPE_CHOICES, default="academic"
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    location = models.CharField(max_length=200, blank=True)
    organizer = models.CharField(max_length=200, blank=True)
    organizer_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="organized_events",
    )
    max_attendees = models.PositiveIntegerField(blank=True, null=True)
    attendees = models.ManyToManyField(User, blank=True, related_name="event_attendees")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    cover_image = models.ImageField(upload_to="event_covers/", blank=True, null=True)
    registration_link = models.URLField(blank=True, null=True)

    class Meta:
        ordering = ["start_time"]
        verbose_name = "Event"
        verbose_name_plural = "Events"

    def __str__(self):
        return f"{self.title} ({self.start_time:%Y-%m-%d})"
