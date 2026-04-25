from django.contrib import admin
from .models import AITrainingSession, TrainedModel, AIChunk


@admin.register(AITrainingSession)
class AITrainingSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "status", "started_at", "completed_at")
    readonly_fields = ("started_at", "completed_at")
    filter_horizontal = ("documents",)


@admin.register(TrainedModel)
class TrainedModelAdmin(admin.ModelAdmin):
    list_display = ("name", "training_session", "is_active", "created_at")
    readonly_fields = ("created_at",)
    actions = ["set_active"]

    def set_active(self, request, queryset):
        # deactivate all trained models, then activate selected one(s)
        TrainedModel.objects.update(is_active=False)
        for obj in queryset:
            obj.is_active = True
            obj.save()

    set_active.short_description = (
        "Set selected trained model(s) active and deactivate others"
    )


@admin.register(AIChunk)
class AIChunkAdmin(admin.ModelAdmin):
    list_display = ("id", "training_session", "document", "chunk_index", "created_at")
    readonly_fields = ("created_at",)
