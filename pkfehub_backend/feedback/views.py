from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from django.db.models import Q
from .models import FeedbackCategory, FeedbackSubmission, FeedbackResponse
from .serializers import (
    FeedbackCategorySerializer,
    FeedbackSubmissionSerializer,
    FeedbackResponseSerializer,
)
from rest_framework.pagination import PageNumberPagination


class FeedbackPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"  # allow frontend to override
    max_page_size = 100


class FeedbackCategoryListView(generics.ListAPIView):
    queryset = FeedbackCategory.objects.filter(is_active=True)
    serializer_class = FeedbackCategorySerializer
    permission_classes = [permissions.AllowAny]


class FeedbackSubmissionDetailView(generics.RetrieveUpdateAPIView):
    queryset = FeedbackSubmission.objects.all()
    serializer_class = FeedbackSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]


class FeedbackSubmissionCreateView(generics.CreateAPIView):
    queryset = FeedbackSubmission.objects.all()
    serializer_class = FeedbackSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FeedbackSubmissionListView(generics.ListAPIView):
    serializer_class = FeedbackSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = FeedbackPagination  # <--- this is CRITICAL

    def get_queryset(self):
        mine = self.request.query_params.get("mine")
        qs = FeedbackSubmission.objects.all().order_by("-created_at")
        if mine and mine == "1":
            return qs.filter(user=self.request.user)
        return qs


class FeedbackBulkActionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ids = request.data.get("ids", [])
        action = request.data.get("action")
        if not ids or not action:
            return Response({"error": "ids and action required"}, status=400)
        if action == "delete":
            FeedbackSubmission.objects.filter(id__in=ids).delete()
            return Response({"deleted": ids}, status=200)
        elif action == "status":
            status_val = request.data.get("status")
            FeedbackSubmission.objects.filter(id__in=ids).update(status=status_val)
            return Response({"updated": ids, "status": status_val}, status=200)
        else:
            return Response({"error": "Invalid action"}, status=400)


class FeedbackResponseListCreateView(generics.ListCreateAPIView):
    """
    GET: List all responses for a feedback
    POST: Add a new response (admin or user)
    """

    serializer_class = FeedbackResponseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        feedback_id = self.kwargs["feedback_id"]
        return FeedbackResponse.objects.filter(feedback_id=feedback_id).order_by(
            "created_at"
        )

    def perform_create(self, serializer):
        feedback_id = self.kwargs["feedback_id"]
        is_admin = self.request.user.is_staff or self.request.user.is_superuser
        serializer.save(
            feedback_id=feedback_id,
            user=self.request.user,
            admin=is_admin,
        )
