from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Occasion(models.Model):
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=20, default="#ffd700")
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Media(models.Model):
    MEDIA_TYPE_CHOICES = (("photo", "Photo"), ("video", "Video"))
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES)
    title = models.CharField(max_length=200, blank=True)
    caption = models.CharField(max_length=200, blank=True)
    date = models.DateField()
    occasion = models.ForeignKey(Occasion, on_delete=models.SET_NULL, null=True)
    file = models.FileField(upload_to="media/")
    thumbnail = models.ImageField(upload_to="thumbnails/", blank=True, null=True)
    likes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    # Optionally: duration, for videos

    def __str__(self):
        return self.title or self.caption or f"{self.media_type} ({self.id})"


class Like(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    session_key = models.CharField(max_length=40, blank=True, null=True)
    media = models.ForeignKey(Media, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
