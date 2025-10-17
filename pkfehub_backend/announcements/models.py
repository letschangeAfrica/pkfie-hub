from django.db import models
from users.models import User


class Announcement(models.Model):
    PRIORITY_CHOICES = (
        ("low", "Low"),
        ("normal", "Normal"),
        ("high", "High"),
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="announcements"
    )
    priority = models.CharField(
        max_length=20, choices=PRIORITY_CHOICES, default="normal"
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "announcements"
        verbose_name = "Announcement"
        verbose_name_plural = "Announcements"

    def __str__(self):
        return self.title


class AnnouncementView(models.Model):
    announcement = models.ForeignKey(
        Announcement, on_delete=models.CASCADE, related_name="views"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="announcement_views"
    )
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "announcement_views"
        verbose_name = "Announcement View"
        verbose_name_plural = "Announcement Views"

    def __str__(self):
        return f"{self.user.email} viewed {self.announcement.title}"
