from rest_framework import serializers
from .models import Conversation, Message, AIModel, ChatStatistics


class ConversationSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    messages_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "user",
            "user_email",
            "title",
            "is_active",
            "created_at",
            "updated_at",
            "messages_count",
        ]
        read_only_fields = (
            "id",
            "user",
            "created_at",
            "updated_at",
            "messages_count",
            "user_email",
        )

    def get_messages_count(self, obj):
        return obj.messages.count()


class MessageSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    conversation_id = serializers.IntegerField(source="conversation.id", read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "conversation_id",
            "user",
            "user_email",
            "message_text",
            "message_type",
            "references",
            "confidence_score",
            "is_helpful",
            "feedback_comment",
            "created_at",
        ]
        read_only_fields = ("id", "created_at", "user_email", "conversation_id")


class AIModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModel
        fields = [
            "id",
            "name",
            "version",
            "provider",
            "is_active",
            "config",
            "created_at",
        ]
        read_only_fields = ("id", "created_at")


class ChatStatisticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatStatistics
        fields = [
            "id",
            "date",
            "total_messages",
            "average_response_time",
            "common_questions",
            "user_satisfaction_rate",
            "created_at",
        ]
        read_only_fields = ("id", "created_at")
