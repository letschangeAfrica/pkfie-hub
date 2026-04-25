# RAG-safe chat view with conversation history included and improved sources formatting.
import logging
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Conversation, Message, AIModel
from .serializers import MessageSerializer
from django.conf import settings
from django.db.models import Q
from django.urls import reverse, NoReverseMatch

from openai import OpenAI
import os
import re

logger = logging.getLogger(__name__)
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY", getattr(settings, "OPENAI_API_KEY", None))
)

# Optional imports - if ai_training not installed we'll skip RAG
try:
    from ai_training.models import TrainedModel
    from ai_training.services import Retriever
except Exception:
    TrainedModel = None
    Retriever = None


def _call_llm_with_messages(messages_payload, model_params):
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
    return ai_response_text


def _gather_conversation_history(conversation, before_message_id=None, max_messages=10):
    """
    Return the last `max_messages` messages for the conversation (oldest->newest).
    If before_message_id is provided, include messages with created_at < that message.
    """
    qs = Message.objects.filter(conversation=conversation).order_by("created_at")
    if before_message_id:
        try:
            before = Message.objects.get(id=before_message_id)
            qs = qs.filter(created_at__lt=before.created_at)
        except Message.DoesNotExist:
            pass
    # Grab last max_messages
    msgs = list(qs)
    if len(msgs) > max_messages:
        msgs = msgs[-max_messages:]
    payload = []
    for m in msgs:
        role = "assistant" if m.message_type == "assistant" else "user"
        payload.append({"role": role, "content": m.message_text})
    return payload


def _clean_preview(text: str, max_chars: int = 320) -> str:
    """
    Produce a preview that ends on a sentence boundary when possible.
    If no sentence boundary found within max_chars, fall back to trimming safely.
    """
    if not text:
        return ""
    # collapse whitespace
    t = re.sub(r"\s+", " ", text).strip()
    if len(t) <= max_chars:
        return t
    # try to find a sentence end before max_chars
    slice_ = t[: max_chars + 50]  # a little extra to find end of sentence
    # prefer a period, question mark, or exclamation
    m = list(re.finditer(r"[.?!]\s", slice_))
    if m:
        # take the last sentence end before max_chars if possible
        chosen = None
        for match in m:
            if match.start() <= max_chars:
                chosen = match.end()
        if chosen:
            return slice_[:chosen].strip()
    # fallback: cut at last space before max_chars to avoid mid-word
    cut = t.rfind(" ", 0, max_chars)
    if cut == -1:
        return t[:max_chars].strip()
    return t[:cut].strip()


def _make_document_url(document_id):
    """
    If your documents app exposes a detail view named 'documents:detail' with pk,
    try to reverse it. Otherwise return None and frontend can link by document id.
    """
    try:
        return reverse("documents:detail", kwargs={"pk": document_id})
    except (NoReverseMatch, Exception):
        return None


class AIChatAPIView(APIView):
    """
    RAG-enabled AI chat view that:
      - includes recent conversation history so the model maintains context across turns
      - attempts retrieval from active TrainedModel (if available) and inserts it as a system context
      - falls back to the original direct LLM call on any failure
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        conversation_id = request.data.get("conversation_id")
        message_text = request.data.get("message")
        selected_model_id = request.data.get("model_id", None)

        if not message_text:
            return Response({"error": "Message text is required."}, status=400)

        # 1) Get or create conversation
        if conversation_id:
            conversation = get_object_or_404(
                Conversation, id=conversation_id, user=user
            )
        else:
            conversation = Conversation.objects.create(
                user=user, title=(message_text or "")[:60]
            )

        # 2) Save the user message (so conversation history persists)
        user_message = Message.objects.create(
            conversation=conversation,
            user=user,
            message_text=message_text,
            message_type="user",
        )

        # 3) Determine model parameters (same logic as before)
        model_params = {
            "model": "gpt-3.5-turbo",
            "max_tokens": 300,
            "temperature": 0.3,
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

        # 4) Try retrieval (RAG) - safe: any exception -> clear rag_contexts and continue to fallback
        rag_contexts = []
        used_chunks = []
        try:
            if TrainedModel and Retriever:
                active_trained = (
                    TrainedModel.objects.filter(is_active=True)
                    .order_by("-created_at")
                    .first()
                )
                if (
                    active_trained
                    and isinstance(active_trained.model_metadata, dict)
                    and active_trained.model_metadata.get("chroma_collection")
                ):
                    collection_name = active_trained.model_metadata.get(
                        "chroma_collection"
                    )
                    retriever = Retriever(collection_name=collection_name)
                    hits = retriever.query(message_text, k=8)

                    # build a deduplicated, nicely formatted used_chunks list
                    seen_chunk_ids = set()
                    for h in hits:
                        md = h.get("metadata", {}) or {}
                        chunk_id = md.get("chunk_id") or h.get("id")
                        # dedupe by chunk id
                        if chunk_id in seen_chunk_ids:
                            continue
                        seen_chunk_ids.add(chunk_id)

                        doc_id = md.get("document_id")
                        title = md.get("title") or f"Document {doc_id}"
                        label = f"{title} · chunk {md.get('chunk_id') or 'n/a'}"

                        preview_raw = (h.get("document_text") or "")[:5000]
                        preview = _clean_preview(preview_raw, max_chars=320)

                        doc_url = _make_document_url(doc_id) if doc_id else None
                        used_chunks.append(
                            {
                                "chunk_ref": h.get("id"),
                                "document_id": doc_id,
                                "chunk_id": md.get("chunk_id"),
                                "title": title,
                                "label": label,
                                "preview": preview,
                                "raw_preview": preview_raw[:2000],
                                "distance": h.get("distance"),
                                "document_url": doc_url,
                            }
                        )
                        # include the full text or truncated text as context
                        rag_contexts.append(preview_raw[:2000])
        except Exception:
            logger.exception("RAG retrieval failed; continuing without retrieval")
            rag_contexts = []
            used_chunks = []

        # If you got rag_contexts, build a system context instructing the model to use them.
        messages_payload = []

        if rag_contexts:
            context_block = (
                "Use the following referenced document excerpts to answer the user's question. "
                "Do NOT hallucinate — if the answer is not present in the excerpts, say you don't know.\n\n"
            )
            for i, c in enumerate(rag_contexts):
                context_block += f"[Excerpt {i+1}]:\n{c}\n\n"
            context_block += "Cite the source excerpts by number when relevant.\n\n"
            messages_payload.append({"role": "system", "content": context_block})
        else:
            default_system = getattr(settings, "CHAT_SYSTEM_PROMPT", None) or (
                "You are a helpful assistant. Answer questions concisely and truthfully. "
                "If you don't know the answer, say you don't know."
            )
            messages_payload.append({"role": "system", "content": default_system})

        # Add recent history (exclude the user_message itself by only including messages older than it)
        history_payload = _gather_conversation_history(
            conversation, before_message_id=user_message.id, max_messages=8
        )
        messages_payload.extend(history_payload)

        # Finally append the current user message
        messages_payload.append({"role": "user", "content": message_text})

        # 6) Call the LLM (with fallback to direct call without context if LLM call fails)
        try:
            ai_response_text = _call_llm_with_messages(messages_payload, model_params)
        except Exception:
            logger.exception(
                "OpenAI call with contexts failed; retrying without contexts"
            )
            try:
                ai_response_text = _call_llm_with_messages(
                    [{"role": "user", "content": message_text}], model_params
                )
            except Exception as e:
                logger.exception("OpenAI direct call also failed")
                import traceback

                return Response(
                    {"error": str(e), "trace": traceback.format_exc()}, status=500
                )

        # 7) Save assistant message with references (used_chunks from retrieval if any)
        from django.contrib.auth import get_user_model

        User = get_user_model()
        assistant_user, _ = User.objects.get_or_create(
            email="assistant@example.com",
            defaults={
                "first_name": "Assistant",
                "last_name": "Bot",
                "is_active": False,
            },
        )
        # Save the raw used_chunks list in Message.references so UI can render it
        ai_message = Message.objects.create(
            conversation=conversation,
            user=assistant_user,
            message_text=ai_response_text,
            message_type="assistant",
            references=used_chunks or [],
        )

        # 8) Update conversation timestamp
        conversation.updated_at = timezone.now()
        conversation.save(update_fields=["updated_at"])

        resp_payload = {
            "conversation_id": conversation.id,
            "ai_message": MessageSerializer(ai_message).data,
            "user_message": MessageSerializer(user_message).data,
            "used_model": getattr(model_override, "id", None),
            # include nicely-formatted sources for immediate frontend use (duplicates removed, previews cleaned)
            "sources": used_chunks or [],
        }

        return Response(resp_payload, status=status.HTTP_200_OK)
