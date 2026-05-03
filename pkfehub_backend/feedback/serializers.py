from rest_framework import serializers
from .models import (
    FeedbackCategory,
    FeedbackSubmission,
    FeedbackAttachment,
    FeedbackResponse,
)


class FeedbackCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackCategory
        fields = ["id", "name", "description", "is_active"]


class FeedbackAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    def get_url(self, obj):
        request = self.context.get("request")
        if obj.file:
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None

    class Meta:
        model = FeedbackAttachment
        fields = ["id", "file_name", "url", "file_size", "uploaded_at"]


class FeedbackResponseSerializer(serializers.ModelSerializer):
    admin = serializers.BooleanField(read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = FeedbackResponse
        fields = ["id", "message", "admin", "user_email", "created_at"]


class FeedbackSubmissionSerializer(serializers.ModelSerializer):
    category = FeedbackCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=FeedbackCategory.objects.filter(is_active=True),
        write_only=True,
        source="category",
    )
    attachments = FeedbackAttachmentSerializer(many=True, read_only=True)
    responses = FeedbackResponseSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.SerializerMethodField(read_only=True)
    assigned_to_email = serializers.EmailField(
        source="assigned_to.email", read_only=True
    )
    responded_by_email = serializers.EmailField(
        source="responded_by.email", read_only=True
    )

    def get_user_name(self, obj):
        if obj.user.first_name or obj.user.last_name:
            return f"{obj.user.first_name} {obj.user.last_name}".strip()
        return getattr(obj.user, "username", obj.user.email.split("@")[0])

    class Meta:
        model = FeedbackSubmission
        fields = [
            "id",
            "user",
            "user_email",
            "user_name",
            "category",
            "category_id",
            "subject",
            "message",
            "rating",
            "status",
            "priority",
            "assigned_to",
            "assigned_to_email",
            "response_text",
            "responded_by",
            "responded_by_email",
            "response_date",
            "attachments",
            "responses",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "attachments",
            "responses",
            "user_email",
            "user_name",
            "assigned_to_email",
            "responded_by_email",
            "user",
        ]
