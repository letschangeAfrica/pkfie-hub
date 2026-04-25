from rest_framework import serializers
from .models import AITrainingSession, TrainedModel, AIChunk


class AIChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIChunk
        fields = [
            "id",
            "training_session",
            "document",
            "chunk_index",
            "text",
            "metadata",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AITrainingSessionSerializer(serializers.ModelSerializer):
    documents_count = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = AITrainingSession
        fields = [
            "id",
            "status",
            "documents_count",
            "chunks_processed",
            "total_chunks",
            "progress_percentage",
            "started_at",
            "completed_at",
            "error_message",
            "metadata",
        ]

    def get_documents_count(self, obj):
        return obj.documents.count()

    def get_progress_percentage(self, obj):
        if obj.total_chunks > 0:
            try:
                return int((obj.chunks_processed / obj.total_chunks) * 100)
            except Exception:
                return 0
        return 0


class TrainedModelSerializer(serializers.ModelSerializer):
    training_session = AITrainingSessionSerializer(read_only=True)

    class Meta:
        model = TrainedModel
        fields = "__all__"
        read_only_fields = ("id", "created_at")
