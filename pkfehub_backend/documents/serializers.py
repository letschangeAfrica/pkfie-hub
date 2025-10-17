from rest_framework import serializers
from .models import DocumentCategory, Document, DocumentChunk, DocumentView


class DocumentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentCategory
        fields = [
            "id",
            "name",
            "description",
            "parent_category",
            "display_order",
            "is_active",
            "created_at",
        ]


class DocumentSerializer(serializers.ModelSerializer):
    category = DocumentCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=DocumentCategory.objects.all(), write_only=True, source="category"
    )
    file_url = serializers.SerializerMethodField()
    uploaded_by_email = serializers.CharField(
        source="uploaded_by.email", read_only=True
    )

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "description",
            "file",
            "file_url",
            "file_name",
            "file_path",
            "file_size",
            "file_type",
            "category",
            "category_id",
            "uploaded_by",
            "uploaded_by_email",
            "version",
            "status",
            "is_approved",
            "approved_by",
            "approval_date",
            "is_active",
            "effective_date",
            "expiration_date",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "file_url",
            "file_name",
            "file_path",
            "file_size",
            "file_type",
            "uploaded_by",
            "uploaded_by_email",
            "created_at",
            "updated_at",
        ]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and hasattr(obj.file, "url"):
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["uploaded_by"] = user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Optional: handle file updates and derived fields
        return super().update(instance, validated_data)


class DocumentChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentChunk
        fields = "__all__"


class DocumentViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentView
        fields = "__all__"
