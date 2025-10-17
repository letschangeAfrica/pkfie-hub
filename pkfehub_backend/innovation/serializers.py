from rest_framework import serializers
from .models import (
    InnovationProject,
    InnovationChallenge,
    InnovationResource,
    InnovationCommunityMember,
)


class InnovationProjectSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    is_featured = (
        serializers.ReadOnlyField()
    )  # Make featured flag read-only for API users

    class Meta:
        model = InnovationProject
        fields = "__all__"

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None


class InnovationChallengeSerializer(serializers.ModelSerializer):
    participants_count = serializers.SerializerMethodField()

    class Meta:
        model = InnovationChallenge
        fields = "__all__"

    def get_participants_count(self, obj):
        return obj.participants.count()


class InnovationResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = InnovationResource
        fields = "__all__"


class InnovationCommunityMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = InnovationCommunityMember
        fields = "__all__"
