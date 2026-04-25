from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.conf import settings

from .models import AITrainingSession, TrainedModel
from .serializers import AITrainingSessionSerializer, TrainedModelSerializer
from .tasks import ingest_and_index_documents

# documents import (optional check)
try:
    from documents.models import Document
except Exception:
    Document = None


class AITrainingSessionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AITrainingSession.objects.all().order_by("-started_at")
    serializer_class = AITrainingSessionSerializer
    permission_classes = [permissions.IsAuthenticated]


class TrainedModelViewSet(viewsets.ModelViewSet):
    queryset = TrainedModel.objects.all().order_by("-created_at")
    serializer_class = TrainedModelSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(
        detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def set_active(self, request, pk=None):
        model = self.get_object()
        if not request.user.is_staff:
            return Response({"detail": "Admin only"}, status=status.HTTP_403_FORBIDDEN)
        TrainedModel.objects.exclude(id=model.id).update(is_active=False)
        model.is_active = True
        model.save()
        return Response({"message": "Model activated successfully"})


class DocumentTrainingViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["post"])
    def train(self, request):
        """
        Start a new training session for the given list of document IDs.
        POST body: { "document_ids": [1,2,3] }
        """
        document_ids = request.data.get("document_ids") or []
        if not isinstance(document_ids, (list, tuple)) or len(document_ids) == 0:
            return Response(
                {"error": "document_ids required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Ensure documents exist
        docs_qs = (
            Document.objects.filter(id__in=document_ids) if Document is not None else []
        )
        if docs_qs.count() == 0:
            return Response(
                {"error": "No valid documents found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create session
        session = AITrainingSession.objects.create(
            status=AITrainingSession.STATUS_PENDING
        )
        session.documents.set(docs_qs)
        session.save()

        # enqueue Celery task
        task = ingest_and_index_documents.delay(session.id)
        session.metadata = session.metadata or {}
        session.metadata["celery_task_id"] = task.id
        session.save(update_fields=["metadata"])

        return Response(
            {"message": "Training started", "training_session_id": session.id},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["get"])
    def status(self, request, pk=None):
        session = get_object_or_404(AITrainingSession, pk=pk)
        return Response(AITrainingSessionSerializer(session).data)
