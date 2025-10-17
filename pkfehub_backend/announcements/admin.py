from django.contrib import admin
from .models import Announcement, AnnouncementView


class AnnouncementViewInline(admin.TabularInline):
    model = AnnouncementView
    extra = 0
    readonly_fields = ("user", "viewed_at")
    can_delete = False


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "author",
        "priority",
        "start_date",
        "end_date",
        "is_active",
        "created_at",
    )
    list_filter = ("priority", "is_active", "start_date", "end_date")
    search_fields = ("title", "content", "author__email")
    ordering = ("-created_at",)
    inlines = [AnnouncementViewInline]  # <--- This line adds the inline!


@admin.register(AnnouncementView)
class AnnouncementViewAdmin(admin.ModelAdmin):
    list_display = ("announcement", "user", "viewed_at")
    search_fields = ("announcement__title", "user__email")
    list_filter = ("announcement", "user")
