from django.contrib import admin
from .models import (
    InnovationProject,
    InnovationChallenge,
    InnovationResource,
    InnovationCommunityMember,
)


@admin.register(InnovationProject)
class InnovationProjectAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "team",
        "status",
        "created_at",
        "is_featured",
    )  # Added is_featured
    list_editable = (
        "is_featured",
    )  # Make is_featured directly editable from list view
    search_fields = ("title", "category", "team", "status")


@admin.register(InnovationChallenge)
class InnovationChallengeAdmin(admin.ModelAdmin):
    list_display = ("title", "deadline", "prize")
    search_fields = ("title", "prize")


@admin.register(InnovationResource)
class InnovationResourceAdmin(admin.ModelAdmin):
    list_display = ("title", "icon", "link")
    search_fields = ("title",)


@admin.register(InnovationCommunityMember)
class InnovationCommunityMemberAdmin(admin.ModelAdmin):
    list_display = ("user", "joined_at")
    search_fields = ("user__username",)
