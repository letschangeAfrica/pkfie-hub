from rest_framework import serializers
from .models import Announcement, AnnouncementView


class AnnouncementSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "content",
            "priority",
            "start_date",
            "end_date",
            "is_active",
            "created_at",
            "updated_at",
            "author",
            "author_email",
            "status",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "author",
            "author_email",
            "status",
        ]

    def get_status(self, obj):
        from django.utils import timezone

        now = timezone.now()
        if obj.end_date and obj.end_date < now:
            return "expired"
        return "active" if obj.is_active else "inactive"

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["author"] = user
        return super().create(validated_data)


class AnnouncementViewSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(
        source="user.get_full_name", read_only=True
    )  # Optional

    class Meta:
        model = AnnouncementView
        fields = "__all__"
        read_only_fields = ("user",)
        # Optionally, add 'user_email' and 'user_full_name' to fields if not using __all__:
        # fields = ["id", "announcement", "user", "user_email", "user_full_name", "viewed_at"]
