from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class InnovationProject(models.Model):
    STATUS_CHOICES = [
        ("completed", "Completed"),
        ("in-progress", "In Progress"),
        ("planning", "Planning"),
    ]
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=100)
    team = models.CharField(max_length=100)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)
    image = models.ImageField(upload_to="innovation_projects/", blank=True, null=True)
    code_link = models.URLField(blank=True, null=True)
    details_link = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    is_featured = models.BooleanField(default=False)  # <-- NEW FIELD

    def __str__(self):
        return self.title


class InnovationChallenge(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    deadline = models.DateField()
    prize = models.CharField(max_length=255)
    participants = models.ManyToManyField(
        User, blank=True, related_name="challenge_participants"
    )

    def __str__(self):
        return self.title


class InnovationResource(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    icon = models.CharField(max_length=50)
    link = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.title


class InnovationCommunityMember(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # Always return a string, even if user or username is missing
        if self.user and getattr(self.user, "username", None):
            return str(self.user.username)
        return "Unknown Member"
