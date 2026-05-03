from django.db import models
from users.models import User


class FeedbackCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback_categories"
        verbose_name = "Feedback Category"
        verbose_name_plural = "Feedback Categories"

    def __str__(self):
        return self.name


class FeedbackSubmission(models.Model):
    STATUS_CHOICES = (
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    )
    PRIORITY_CHOICES = (
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    )

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="feedback_submissions"
    )
    category = models.ForeignKey(FeedbackCategory, on_delete=models.CASCADE)
    subject = models.CharField(max_length=200)
    message = models.TextField()
    rating = models.IntegerField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    priority = models.CharField(
        max_length=20, choices=PRIORITY_CHOICES, default="medium"
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="assigned_feedback",
    )
    # The legacy response fields (keep for now, but use feedback responses below)
    response_text = models.TextField(blank=True, null=True)
    responded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="responded_feedback",
    )
    response_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "feedback_submissions"
        verbose_name = "Feedback Submission"
        verbose_name_plural = "Feedback Submissions"

    def __str__(self):
        return f"{self.subject} - {self.user.email}"


class FeedbackAttachment(models.Model):
    feedback = models.ForeignKey(
        FeedbackSubmission, on_delete=models.CASCADE, related_name="attachments"
    )
    file = models.FileField(upload_to="feedback_attachments/", null=True, blank=True)
    file_name = models.CharField(max_length=500)
    file_size = models.IntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback_attachments"
        verbose_name = "Feedback Attachment"
        verbose_name_plural = "Feedback Attachments"

    def __str__(self):
        return f"Attachment for {self.feedback.subject}"


class FeedbackResponse(models.Model):
    feedback = models.ForeignKey(
        FeedbackSubmission, on_delete=models.CASCADE, related_name="responses"
    )
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    admin = models.BooleanField(default=False)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback_responses"
        verbose_name = "Feedback Response"
        verbose_name_plural = "Feedback Responses"

    def __str__(self):
        return (
            f"Response to {self.feedback.subject} ({'Admin' if self.admin else 'User'})"
        )
