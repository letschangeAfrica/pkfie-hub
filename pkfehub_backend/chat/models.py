from django.db import models
from users.models import User


class Conversation(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="conversations"
    )
    title = models.CharField(max_length=500, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "conversations"
        verbose_name = "Conversation"
        verbose_name_plural = "Conversations"

    def __str__(self):
        return f"Conversation {self.id} - {self.user.email}"


class Message(models.Model):
    MESSAGE_TYPE_CHOICES = (
        ("user", "User"),
        ("assistant", "Assistant"),
    )

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="messages")
    message_text = models.TextField()
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES)
    references = models.JSONField(default=list)  # Store document references for answers
    confidence_score = models.FloatField(blank=True, null=True)
    is_helpful = models.BooleanField(blank=True, null=True)  # User feedback
    feedback_comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "messages"
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.message_type} message from {self.user.email}"


class AIModel(models.Model):
    name = models.CharField(max_length=100)
    version = models.CharField(max_length=50, blank=True)
    provider = models.CharField(max_length=50)  # e.g., OpenAI, Anthropic, etc.
    is_active = models.BooleanField(default=True)
    config = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_models"
        verbose_name = "AI Model"
        verbose_name_plural = "AI Models"

    def __str__(self):
        return f"{self.provider} - {self.name} v{self.version}"


class ChatStatistics(models.Model):
    date = models.DateField(unique=True)
    total_messages = models.IntegerField(default=0)
    average_response_time = models.FloatField(blank=True, null=True)
    common_questions = models.JSONField(default=list)
    user_satisfaction_rate = models.FloatField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chat_statistics"
        verbose_name = "Chat Statistics"
        verbose_name_plural = "Chat Statistics"

    def __str__(self):
        return f"Chat stats for {self.date}"
