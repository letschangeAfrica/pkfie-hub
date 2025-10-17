from rest_framework import serializers
from .models import Occasion, Media, Like


class OccasionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Occasion
        fields = "__all__"


class MediaSerializer(serializers.ModelSerializer):
    occasion = OccasionSerializer()

    class Meta:
        model = Media
        fields = "__all__"


class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = "__all__"
