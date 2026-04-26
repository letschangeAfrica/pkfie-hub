from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        exclude = ("user", "id")
        read_only_fields = ("created_at", "updated_at")

    def get_profile_picture_url(self, obj):
        request = self.context.get("request", None)
        if obj.profile_picture:
            try:
                # If context contains request, build full URL
                if request:
                    return request.build_absolute_uri(obj.profile_picture.url)
                return obj.profile_picture.url
            except Exception:
                return None
        return None


class UserUpdateSerializer(serializers.ModelSerializer):
    profile_picture = serializers.ImageField(required=False, write_only=True)
    profile = UserProfileSerializer(required=False)
    is_active = serializers.BooleanField(
        required=False
    )  # <-- Make sure this line is present!

    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "phone_number",
            "profile_picture",
            "profile",
            "student_id",
            "is_active",  # <-- Make sure this is included!
        )

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        profile_picture = validated_data.pop("profile_picture", None)

        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update profile fields
        if profile_data:
            for attr, value in profile_data.items():
                setattr(instance.profile, attr, value)

        # Update the profile_picture if provided
        if profile_picture:
            instance.profile.profile_picture = profile_picture

        instance.profile.save()
        return instance


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "student_id",
            "phone_number",
            "is_verified",
            "is_active",
            "is_staff",
            "is_superuser",
            "last_login",
            "created_at",
            "updated_at",
            "profile",
        )
        read_only_fields = (
            "id",
            "is_verified",
            "is_active",
            "is_staff",
            "is_superuser",
            "last_login",
            "created_at",
            "updated_at",
        )


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "password2",
            "first_name",
            "last_name",
            "role",
            "student_id",
            "phone_number",
        )

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )

        # Student ID is required for students
        if attrs.get("role") == "student" and not attrs.get("student_id"):
            raise serializers.ValidationError(
                {"student_id": "Student ID is required for students."}
            )

        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        user = User.objects.create_user(**validated_data)
        return user
