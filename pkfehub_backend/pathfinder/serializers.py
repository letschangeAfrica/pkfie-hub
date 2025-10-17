from rest_framework import serializers
from .models import (
    Program,
    ProgramFeature,
    PathfinderQuestion,
    PathfinderOption,
    PathfinderSession,
    PathfinderAnswer,
)


class ProgramFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramFeature
        fields = ["id", "feature_name", "feature_description", "display_order"]


class ProgramSerializer(serializers.ModelSerializer):
    features = ProgramFeatureSerializer(many=True, read_only=True)

    class Meta:
        model = Program
        fields = [
            "id",
            "name",
            "code",
            "description",
            "duration_years",
            "requirements",
            "career_opportunities",
            "tuition_fee",
            "additional_fees",
            "is_active",
            "features",
        ]


class PathfinderOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PathfinderOption
        fields = [
            "id",
            "option_text",
            "option_value",
            "program_weights",
            "display_order",
            "question",
        ]


class PathfinderQuestionSerializer(serializers.ModelSerializer):
    options = PathfinderOptionSerializer(many=True, read_only=True)

    class Meta:
        model = PathfinderQuestion
        fields = [
            "id",
            "question_text",
            "question_type",
            "display_order",
            "is_active",
            "options",
        ]


class PathfinderAnswerSerializer(serializers.ModelSerializer):
    question = serializers.PrimaryKeyRelatedField(
        queryset=PathfinderQuestion.objects.all()
    )
    option = serializers.PrimaryKeyRelatedField(
        queryset=PathfinderOption.objects.all(), allow_null=True
    )

    class Meta:
        model = PathfinderAnswer
        fields = [
            "id",
            "session",
            "question",
            "option",
            "answer_value",
            "created_at",
        ]


class PathfinderSessionSerializer(serializers.ModelSerializer):
    answers = PathfinderAnswerSerializer(many=True, read_only=True)
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = PathfinderSession
        fields = [
            "id",
            "user",
            "completed",
            "results",
            "created_at",
            "completed_at",
            "answers",
        ]
