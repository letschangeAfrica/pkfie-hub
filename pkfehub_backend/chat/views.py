"""
chat/views.py — AI chat using Anthropic Claude (primary) or OpenAI (fallback).
"""

import logging
import os
import time

from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count

from .models import Conversation, Message, AIModel, ChatStatistics
from .serializers import ConversationSerializer, MessageSerializer, AIModelSerializer

logger = logging.getLogger(__name__)

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_KEY    = os.getenv("OPENAI_API_KEY", "")

SYSTEM_PROMPT = (
    "You are the PKFIE-Hub AI Assistant for PKFokam Institute of Excellence. "
    "You help students, lecturers, and parents navigate academic life at PKFokam. "
    "Answer questions about courses, policies, campus services, events, and student support. "
    "Be friendly, concise, and supportive. When you don't know something specific to PKFokam, "
    "say so honestly and direct the user to the academic office or relevant staff."
)


def _call_ai(message_text: str, model_params: dict) -> str:
    """Call Anthropic first, fall back to OpenAI. Raises on both failures."""
    if ANTHROPIC_KEY:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
        model = model_params.get("anthropic_model", "claude-haiku-4-5-20251001")
        resp = client.messages.create(
            model=model,
            max_tokens=model_params.get("max_tokens", 1024),
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": message_text}],
        )
        return resp.content[0].text.strip() or "Sorry, I couldn't generate a response."

    if OPENAI_KEY:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_KEY)
        resp = client.chat.completions.create(
            model=model_params.get("model", "gpt-3.5-turbo"),
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": message_text},
            ],
            max_tokens=model_params.get("max_tokens", 512),
            temperature=model_params.get("temperature", 0.7),
            top_p=model_params.get("top_p", 1.0),
        )
        text = resp.choices[0].message.content.strip()
        return text or "Sorry, I couldn't generate a response."

    raise RuntimeError(
        "No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in your .env file."
    )


def get_assistant_user():
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user, _ = User.objects.get_or_create(
        email="assistant@pkfokam.edu",
        defaults={"first_name": "PKFIE", "last_name": "Assistant", "is_active": False},
    )
    return user


class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.all().order_by("-updated_at")
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            user=self.request.user, is_active=True
        ).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        conv = self.get_object()
        conv.is_active = False
        conv.save()
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
        conversation_id   = request.data.get("conversation_id")
        message_text      = request.data.get("message", "").strip()
        selected_model_id = request.data.get("model_id")

        if not message_text:
            return Response({"error": "Message text is required."}, status=400)

        # 1. Conversation
        if conversation_id:
            conversation = get_object_or_404(Conversation, id=conversation_id, user=user)
        else:
            conversation = Conversation.objects.create(
                user=user, title=message_text[:60]
            )

        # 2. Save user message
        user_message = Message.objects.create(
            conversation=conversation,
            user=user,
            message_text=message_text,
            message_type="user",
        )

        # 3. Resolve model params
        model_params = {
            "model": "gpt-3.5-turbo",
            "anthropic_model": "claude-haiku-4-5-20251001",
            "max_tokens": 1024,
            "temperature": 0.7,
            "top_p": 1.0,
        }
        model_override = None

        if selected_model_id:
            try:
                model_obj = AIModel.objects.get(id=selected_model_id, is_active=True)
                cfg = model_obj.config or {}
                if cfg.get("openai_model"):
                    model_params["model"] = cfg["openai_model"]
                if cfg.get("anthropic_model"):
                    model_params["anthropic_model"] = cfg["anthropic_model"]
                for key in ("temperature", "max_tokens", "top_p"):
                    if key in cfg:
                        model_params[key] = float(cfg[key]) if key != "max_tokens" else int(cfg[key])
                model_override = model_obj
            except AIModel.DoesNotExist:
                return Response({"error": "Selected model not found or inactive."}, status=400)

        # 4. Call AI
        t0 = time.time()
        try:
            ai_text = _call_ai(message_text, model_params)
        except RuntimeError as e:
            return Response(
                {"error": str(e), "setup_required": True},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            logger.exception("AI call failed")
            return Response(
                {"error": "The AI service encountered an error. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        response_time = round(time.time() - t0, 3)

        # 5. Save assistant message
        assistant_user = get_assistant_user()
        ai_message = Message.objects.create(
            conversation=conversation,
            user=assistant_user,
            message_text=ai_text,
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
                "response_time": response_time,
            },
            status=status.HTTP_200_OK,
        )


class AIModelViewSet(viewsets.ModelViewSet):
    queryset = AIModel.objects.all().order_by("-created_at")
    serializer_class = AIModelSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "provider"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]


class ChatStatsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        stats_row = ChatStatistics.objects.order_by("-date").first()
        total_conversations = Conversation.objects.count()
        total_messages = Message.objects.count()

        most_common_questions = list(
            Message.objects.filter(message_type="user")
            .values("message_text")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        assistant_msgs = (
            Message.objects.filter(message_type="assistant")
            .order_by("created_at")
            .select_related("conversation")
        )
        deltas = []
        for am in assistant_msgs:
            prev = (
                Message.objects.filter(
                    conversation=am.conversation,
                    message_type="user",
                    created_at__lt=am.created_at,
                )
                .order_by("-created_at")
                .first()
            )
            if prev:
                d = (am.created_at - prev.created_at).total_seconds()
                if d >= 0:
                    deltas.append(d)
        avg_response = round(sum(deltas) / len(deltas), 2) if deltas else None

        rated_qs = Message.objects.filter(message_type="assistant").exclude(is_helpful__isnull=True)
        total_rated = rated_qs.count()
        helpful = rated_qs.filter(is_helpful=True).count()
        satisfaction = round((helpful / total_rated) * 5, 2) if total_rated else None

        return Response(
            {
                "stats": {
                    "date": stats_row.date if stats_row else timezone.now().date(),
                    "total_messages": (
                        stats_row.total_messages if stats_row and stats_row.total_messages is not None
                        else total_messages
                    ),
                    "average_response_time": (
                        stats_row.average_response_time
                        if stats_row and stats_row.average_response_time is not None
                        else avg_response
                    ),
                    "user_satisfaction_rate": (
                        stats_row.user_satisfaction_rate
                        if stats_row and stats_row.user_satisfaction_rate is not None
                        else satisfaction
                    ),
                    "total_conversations": total_conversations,
                    "common_questions": most_common_questions,
                    "ai_provider": "anthropic" if ANTHROPIC_KEY else ("openai" if OPENAI_KEY else "none"),
                }
            },
            status=status.HTTP_200_OK,
        )
