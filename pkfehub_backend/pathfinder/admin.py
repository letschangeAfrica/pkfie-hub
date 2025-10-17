from django.contrib import admin
from .models import (
    Program,
    ProgramFeature,
    PathfinderQuestion,
    PathfinderOption,
    PathfinderSession,
    PathfinderAnswer,
)


class ProgramFeatureInline(admin.TabularInline):
    model = ProgramFeature
    extra = 1


class ProgramAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "duration_years", "tuition_fee", "is_active")
    list_filter = ("is_active", "duration_years")
    search_fields = ("name", "code", "description")
    inlines = [ProgramFeatureInline]
    readonly_fields = ("created_at", "updated_at")


class PathfinderOptionInline(admin.TabularInline):
    model = PathfinderOption
    extra = 1


class PathfinderQuestionAdmin(admin.ModelAdmin):
    list_display = ("question_text", "question_type", "display_order", "is_active")
    list_filter = ("question_type", "is_active")
    search_fields = ("question_text",)
    ordering = ("display_order",)
    inlines = [PathfinderOptionInline]


class PathfinderAnswerInline(admin.TabularInline):
    model = PathfinderAnswer
    extra = 0
    readonly_fields = ("question", "option", "answer_value", "created_at")


class PathfinderSessionAdmin(admin.ModelAdmin):
    list_display = ("user", "completed", "created_at", "completed_at")
    list_filter = ("completed", "created_at")
    search_fields = ("user__email",)
    readonly_fields = ("created_at", "completed_at")
    inlines = [PathfinderAnswerInline]
    date_hierarchy = "created_at"


admin.site.register(Program, ProgramAdmin)
admin.site.register(PathfinderQuestion, PathfinderQuestionAdmin)
admin.site.register(PathfinderSession, PathfinderSessionAdmin)
