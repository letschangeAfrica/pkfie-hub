from rest_framework import serializers
from .models import CalendarEvent, EventReminder, CalendarSubscription
from users.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email")


class EventReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventReminder
        fields = "__all__"
        read_only_fields = ("is_sent", "sent_at", "created_at")


class CalendarEventSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    reminders = EventReminderSerializer(many=True, read_only=True)
    is_auto_generated = serializers.BooleanField(read_only=True)
    original_object_url = serializers.SerializerMethodField()

    class Meta:
        model = CalendarEvent
        fields = "__all__"
        read_only_fields = (
            "created_at",
            "updated_at",
            "source",
            "source_id",
            "source_data",
        )

    def get_original_object_url(self, obj):
        """Generate URL to the original object if it exists"""
        if obj.source == "events_app" and obj.source_id:
            return f"/api/events/{obj.source_id}/"
        elif obj.source == "announcements_app" and obj.source_id:
            return f"/api/announcements/{obj.source_id}/"
        return None

    def validate(self, data):
        """
        Validate that end_time is after start_time
        """
        if data["start_time"] >= data["end_time"]:
            raise serializers.ValidationError("End time must be after start time")
        return data

    def create(self, validated_data):
        """
        Set the current user as the event creator for personal events
        """
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            if "user" not in validated_data:
                validated_data["user"] = request.user
            # Personal events always have source='personal'
            validated_data["source"] = "personal"
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """
        Prevent editing auto-generated events' core properties
        """
        if instance.is_auto_generated:
            # Allow only certain fields to be modified for auto-generated events
            allowed_fields = ["color", "priority", "reminders"]
            for field in list(validated_data.keys()):
                if field not in allowed_fields:
                    validated_data.pop(field, None)

        return super().update(instance, validated_data)


class CalendarSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarSubscription
        fields = "__all__"
        read_only_fields = ("created_at",)

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["user"] = request.user
        return super().create(validated_data)
