from django.contrib import admin
from .models import CalendarEvent, EventReminder, CalendarSubscription


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "event_type",
        "source",
        "start_time",
        "end_time",
        "user",
        "is_public",
        "is_active",
    ]
    list_filter = ["event_type", "source", "priority", "is_public", "is_active"]
    search_fields = ["title", "description", "location"]
    date_hierarchy = "start_time"
    readonly_fields = ["source", "source_id", "source_data", "created_at", "updated_at"]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("title", "description", "event_type", "source", "source_id")},
        ),
        (
            "Time & Location",
            {
                "fields": (
                    "start_time",
                    "end_time",
                    "is_all_day",
                    "location",
                    "organizer",
                )
            },
        ),
        (
            "User & Visibility",
            {"fields": ("user", "is_public", "is_active", "priority", "color")},
        ),
        (
            "Recurrence",
            {"fields": ("is_recurring", "recurrence_rule"), "classes": ("collapse",)},
        ),
        (
            "Metadata",
            {
                "fields": ("source_data", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )


@admin.register(EventReminder)
class EventReminderAdmin(admin.ModelAdmin):
    list_display = [
        "event",
        "user",
        "reminder_time",
        "reminder_unit",
        "is_sent",
        "sent_at",
    ]
    list_filter = ["reminder_unit", "is_sent"]
    search_fields = ["event__title", "user__username"]
    readonly_fields = ["sent_at", "created_at"]


@admin.register(CalendarSubscription)
class CalendarSubscriptionAdmin(admin.ModelAdmin):
    list_display = ["user", "name", "url", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["user__username", "name"]
    readonly_fields = ["created_at"]
