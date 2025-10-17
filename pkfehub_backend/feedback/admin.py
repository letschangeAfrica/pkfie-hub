from django.contrib import admin
from .models import FeedbackCategory, FeedbackSubmission, FeedbackAttachment


@admin.register(FeedbackCategory)
class FeedbackCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    search_fields = ("name",)
    list_filter = ("is_active", "created_at")


@admin.register(FeedbackSubmission)
class FeedbackSubmissionAdmin(admin.ModelAdmin):
    list_display = ("subject", "user", "category", "status", "priority", "created_at")
    search_fields = ("subject", "message", "user__email")
    list_filter = ("status", "priority", "category", "created_at")
    raw_id_fields = ("user", "assigned_to", "responded_by")
    autocomplete_fields = ["category"]


@admin.register(FeedbackAttachment)
class FeedbackAttachmentAdmin(admin.ModelAdmin):
    list_display = ("file_name", "feedback", "file_size", "uploaded_at")
    search_fields = ("file_name",)
    list_filter = ("uploaded_at",)
