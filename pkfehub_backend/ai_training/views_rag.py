# contents of views_rag.py with the ChatRAGAPIView default k changed from 4 -> 30
import os
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from openai import OpenAI

from .models import TrainedModel
from .services import Retriever

logger = logging.getLogger(__name__)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class ChatRAGAPIView(APIView):
    """
    POST { "message": "your question here", "k": 4 }
    Returns: { "answer": "...", "sources": [ {chunk metadata...}, ... ] }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        message = request.data.get("message")
        if not message:
            return Response(
                {"error": "message required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Increase default k from 4 -> 30 so queries get more candidates when caller omits k
        k = int(request.data.get("k", 30))

        # find active trained model
        trained = (
            TrainedModel.objects.filter(is_active=True).order_by("-created_at").first()
        )
        if not trained or not trained.model_metadata.get("chroma_collection"):
            return Response(
                {"error": "No active trained model available"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        collection_name = trained.model_metadata["chroma_collection"]

        # retrieval
        try:
            retriever = Retriever(collection_name=collection_name)
            hits = retriever.query(message, k=k)
        except Exception as e:
            logger.exception("Retrieval failed")
            return Response(
                {"error": "retrieval_failed", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # If no retrieved context, return a clear "I don't know" without calling LLM
        if not hits:
            return Response(
                {"answer": "I don't know.", "sources": []},
                status=status.HTTP_200_OK,
            )

        # assemble context from retrieved chunks but cap length to avoid token limits
        MAX_CONTEXT_CHARS = 3500
        pieces = []
        total_len = 0
        for h in hits:
            t = h.get("document_text", "") or ""
            if not t:
                continue
            # stop appending once we exceed MAX_CONTEXT_CHARS
            if total_len + len(t) > MAX_CONTEXT_CHARS:
                remaining = MAX_CONTEXT_CHARS - total_len
                if remaining > 0:
                    pieces.append(t[:remaining])
                    total_len += remaining
                break
            pieces.append(t)
            total_len += len(t)
        context = "\n\n".join(pieces)

        # System instruction forces the model to use only provided excerpts and to decline when info missing
        system_msg = (
            "You are a helpful assistant that MUST answer using only the provided excerpts. "
            'If the answer is not present in the excerpts, respond exactly: "I don\'t know." '
            "Do NOT invent facts or add outside information. Be concise and, if asked, cite chunk ids used."
        )

        prompt = (
            f"Use the excerpts below to answer the question. If the information is not present, "
            f'respond with "I don\'t know." Do NOT add or invent details.\n\nEXCERPTS:\n{context}\n\nQuestion: {message}'
        )

        try:
            resp = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": prompt},
                ],
                temperature=0,
                max_tokens=400,
            )
            ai_text = resp.choices[0].message.content.strip()
        except Exception as e:
            logger.exception("OpenAI call failed")
            return Response(
                {"error": "llm_failed", "details": "LLM request failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # return used sources for transparency
        sources = [
            {
                "id": h.get("id"),
                "metadata": h.get("metadata"),
                "preview": (h.get("document_text") or "")[:400],
            }
            for h in hits
        ]

        return Response({"answer": ai_text, "sources": sources})
