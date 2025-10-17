"""
chat/views.py
Updated backend views for AI chat, models, and stats.

- AIChatAPIView: accepts optional `model_id` and uses saved model config when provided.
- AIModelViewSet: allows authenticated users to list/retrieve models, and only admins to create/update/delete.
- ChatStatsAPIView: returns latest stats if available, otherwise computes totals, average response time,
  and user satisfaction from Message rows so the frontend always receives meaningful stats.
"""

import logging
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count
from .models import Conversation, Message, AIModel, ChatStatistics
from .serializers import (
    ConversationSerializer,
    MessageSerializer,
    AIModelSerializer,
)
import os

# OpenAI client
from openai import OpenAI

logger = logging.getLogger(__name__)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def get_assistant_user():
    """
    Get or create a system assistant user for saving assistant messages.
    """
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user, _ = User.objects.get_or_create(
        email="assistant@example.com",
        defaults={
            "first_name": "Assistant",
            "last_name": "Bot",
            "is_active": False,
        },
    )
    return user


class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.all().order_by("-updated_at")
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Conversation.objects.filter(user=user, is_active=True).order_by(
            "-updated_at"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        conversation = self.get_object()
        conversation.is_active = False
        conversation.save()
        return Response({"status": "archived"})


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all().order_by("created_at")
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conversation_id = self.request.query_params.get("conversation")
        qs = Message.objects.filter(user=self.request.user)
        if conversation_id:
            qs = qs.filter(conversation_id=conversation_id)
        return qs.order_by("created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AIChatAPIView(APIView):
    """
    POST /api/chat/ai/
    Body: { message: "...", conversation_id?: <id>, model_id?: <id> }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        conversation_id = request.data.get("conversation_id")
        message_text = request.data.get("message")
        selected_model_id = request.data.get("model_id", None)

        if not message_text:
            return Response({"error": "Message text is required."}, status=400)

        # 1. Get or create conversation
        if conversation_id:
            conversation = get_object_or_404(
                Conversation, id=conversation_id, user=user
            )
        else:
            conversation = Conversation.objects.create(
                user=user, title=(message_text or "")[:60]
            )

        # 2. Save user message
        user_message = Message.objects.create(
            conversation=conversation,
            user=user,
            message_text=message_text,
            message_type="user",
        )

        # 3. Determine model parameters (default => OpenAI gpt-3.5-turbo)
        model_params = {
            "model": "gpt-3.5-turbo",
            "max_tokens": 150,
            "temperature": 0.7,
            "top_p": 1.0,
        }
        model_override = None

        if selected_model_id:
            try:
                model_obj = AIModel.objects.get(id=selected_model_id, is_active=True)
                cfg = model_obj.config or {}
                model_name = (
                    cfg.get("openai_model") or model_obj.name or model_obj.provider
                )
                model_params["model"] = model_name
                if "temperature" in cfg:
                    model_params["temperature"] = float(cfg.get("temperature"))
                if "max_tokens" in cfg:
                    model_params["max_tokens"] = int(cfg.get("max_tokens"))
                if "top_p" in cfg:
                    model_params["top_p"] = float(cfg.get("top_p"))
                model_override = model_obj
            except AIModel.DoesNotExist:
                return Response(
                    {"error": "Selected model not found or inactive."}, status=400
                )

        # 4. Call OpenAI
        try:
            messages_payload = [{"role": "user", "content": message_text}]
            response = client.chat.completions.create(
                model=model_params["model"],
                messages=messages_payload,
                max_tokens=model_params["max_tokens"],
                temperature=model_params["temperature"],
                top_p=model_params.get("top_p", 1.0),
            )
            ai_response_text = response.choices[0].message.content.strip()
            if not ai_response_text:
                ai_response_text = "Sorry, I couldn't generate a response."
        except Exception as e:
            logger.exception("OpenAI call failed")
            import traceback

            return Response(
                {"error": str(e), "trace": traceback.format_exc()}, status=500
            )

        # 5. Save assistant message
        assistant_user = get_assistant_user()
        ai_message = Message.objects.create(
            conversation=conversation,
            user=assistant_user,
            message_text=ai_response_text,
            message_type="assistant",
            references=[],
        )

        # 6. Update conversation timestamp
        conversation.updated_at = timezone.now()
        conversation.save(update_fields=["updated_at"])

        return Response(
            {
                "conversation_id": conversation.id,
                "ai_message": MessageSerializer(ai_message).data,
                "user_message": MessageSerializer(user_message).data,
                "used_model": getattr(model_override, "id", None),
            },
            status=status.HTTP_200_OK,
        )


class AIModelViewSet(viewsets.ModelViewSet):
    """
    Expose AIModel. Allow any authenticated user to list and retrieve models.
    Creation/update/delete require admin privileges.
    """

    queryset = AIModel.objects.all().order_by("-created_at")
    serializer_class = AIModelSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "provider"]

    def get_permissions(self):
        # Safely allow list/retrieve for authenticated users, restrict write to admins
        if self.action in ["list", "retrieve"]:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [p() for p in permission_classes]


class ChatStatsAPIView(APIView):
    """
    Return chat statistics. If ChatStatistics records are missing, compute totals from Message/Conversation rows.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Try to use latest ChatStatistics row; if missing compute on the fly
        stats_row = ChatStatistics.objects.order_by("-date").first()
        total_conversations = Conversation.objects.count()
        total_messages = Message.objects.count()

        # Most common user messages
        most_common_questions_qs = (
            Message.objects.filter(message_type="user")
            .values("message_text")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )
        most_common_questions = list(most_common_questions_qs)

        # Compute average response time pairing assistant messages to preceding user message
        assistant_msgs = (
            Message.objects.filter(message_type="assistant")
            .order_by("created_at")
            .select_related("conversation")
        )
        deltas = []
        for am in assistant_msgs:
            prev_user = (
                Message.objects.filter(
                    conversation=am.conversation,
                    message_type="user",
                    created_at__lt=am.created_at,
                )
                .order_by("-created_at")
                .first()
            )
            if prev_user:
                delta = (am.created_at - prev_user.created_at).total_seconds()
                if delta >= 0:
                    deltas.append(delta)
        average_response_time = round(sum(deltas) / len(deltas), 2) if deltas else None

        # Compute user satisfaction: scale helpful fraction to 5-point scale if possible
        assistant_helpful_qs = Message.objects.filter(message_type="assistant").exclude(
            is_helpful__isnull=True
        )
        total_rated = assistant_helpful_qs.count()
        helpful_count = assistant_helpful_qs.filter(is_helpful=True).count()
        user_satisfaction_rate = (
            round((helpful_count / total_rated) * 5, 2) if total_rated > 0 else None
        )

        payload = {
            "date": stats_row.date if stats_row else timezone.now().date(),
            "total_messages": (
                stats_row.total_messages
                if stats_row and stats_row.total_messages is not None
                else total_messages
            ),
            "average_response_time": (
                stats_row.average_response_time
                if stats_row and stats_row.average_response_time is not None
                else average_response_time
            ),
            "user_satisfaction_rate": (
                stats_row.user_satisfaction_rate
                if stats_row and stats_row.user_satisfaction_rate is not None
                else user_satisfaction_rate
            ),
            "total_conversations": total_conversations,
            "common_questions": most_common_questions,
        }
        return Response({"stats": payload}, status=status.HTTP_200_OK)
