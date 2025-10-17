from rest_framework import viewsets, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import DocumentCategory, Document, DocumentChunk, DocumentView
from .serializers import (
    DocumentCategorySerializer,
    DocumentSerializer,
    DocumentChunkSerializer,
    DocumentViewSerializer,
)


class DocumentCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DocumentCategory.objects.filter(is_active=True)
    serializer_class = DocumentCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all().order_by("-created_at")
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Document.objects.all()
        # Optional: filtering by query params
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        category_param = self.request.query_params.get("category")
        if category_param:
            qs = qs.filter(category__name=category_param)
        return qs

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(
        detail=True, methods=["patch"], permission_classes=[permissions.IsAuthenticated]
    )
    def set_status(self, request, pk=None):
        doc = self.get_object()
        status_value = request.data.get("status")
        if status_value in dict(Document.STATUS_CHOICES):
            doc.status = status_value
            doc.save()
            return Response({"status": doc.status})
        return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)


class DocumentChunkViewSet(viewsets.ModelViewSet):
    queryset = DocumentChunk.objects.all()
    serializer_class = DocumentChunkSerializer
    permission_classes = [permissions.IsAuthenticated]


class DocumentViewViewSet(viewsets.ModelViewSet):
    queryset = DocumentView.objects.all()
    serializer_class = DocumentViewSerializer
    permission_classes = [permissions.IsAuthenticated]
