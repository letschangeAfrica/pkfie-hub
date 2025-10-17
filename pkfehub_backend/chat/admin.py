from django.contrib import admin
from .models import Conversation, Message, AIModel, ChatStatistics


class ConversationAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "is_active", "created_at", "updated_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("user__email", "title")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"


class MessageAdmin(admin.ModelAdmin):
    list_display = ("conversation", "user", "message_type", "created_at")
    list_filter = ("message_type", "created_at")
    search_fields = ("conversation__title", "user__email", "message_text")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"


class AIModelAdmin(admin.ModelAdmin):
    list_display = ("name", "version", "provider", "is_active", "created_at")
    list_filter = ("provider", "is_active")
    search_fields = ("name", "version", "provider")
    readonly_fields = ("created_at",)


class ChatStatisticsAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "total_messages",
        "average_response_time",
        "user_satisfaction_rate",
    )
    readonly_fields = ("created_at",)
    date_hierarchy = "date"


admin.site.register(Conversation, ConversationAdmin)
admin.site.register(Message, MessageAdmin)
admin.site.register(AIModel, AIModelAdmin)
admin.site.register(ChatStatistics, ChatStatisticsAdmin)
