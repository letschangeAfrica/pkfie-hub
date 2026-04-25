import os
import io
import logging
import re
import string
from django.conf import settings
from django.core.files.storage import default_storage
from django.utils import timezone

logger = logging.getLogger(__name__)

# Optional libs
try:
    import PyPDF2
except Exception:
    PyPDF2 = None

try:
    import docx as python_docx
except Exception:
    python_docx = None

# chroma + embedding helper
try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    from chromadb.utils import embedding_functions
except Exception:
    chromadb = None
    ChromaSettings = None
    embedding_functions = None

from .models import AITrainingSession, AIChunk, TrainedModel

# documents import (adjust if your app name or model differs)
try:
    from documents.models import Document
except Exception:
    Document = None


def _read_file_bytes(storage_path: str) -> bytes:
    with default_storage.open(storage_path, "rb") as fh:
        return fh.read()


def _extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """
    Try format-specific extraction. Return empty string if extraction fails.
    """
    name_lower = filename.lower()
    # PDF extraction
    if name_lower.endswith(".pdf") and PyPDF2:
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            pages = []
            for p in reader.pages:
                pages.append(p.extract_text() or "")
            return "\n\n".join(pages).strip()
        except Exception:
            logger.exception("PDF extraction failed for %s", filename)
            return ""
    # DOCX extraction
    if (name_lower.endswith(".docx") or name_lower.endswith(".doc")) and python_docx:
        try:
            # python-docx expects a file-like object (docx.Document can accept a path-like or file-like)
            doc = python_docx.Document(io.BytesIO(file_bytes))
            return "\n\n".join(p.text for p in doc.paragraphs).strip()
        except Exception:
            logger.exception("DOCX extraction failed for %s", filename)
            return ""
    # Fallback: try decode as utf-8 (may produce binary garbage for zipped formats)
    try:
        return file_bytes.decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""


def _chunk_text(text: str, chunk_size_chars: int = 2000, overlap: int = 200):
    if not text:
        return []
    out = []
    start = 0
    L = len(text)
    while start < L:
        end = start + chunk_size_chars
        chunk = text[start:end]
        out.append(chunk.strip())
        start = end - overlap
        if start < 0:
            start = 0
    return out


def _is_mostly_binary(s: str, threshold: float = 0.3) -> bool:
    """
    Return True if string appears to contain too many non-printable characters,
    or has common binary signatures (e.g., PK for docx, %PDF for pdf).
    """
    if not s:
        return True
    # obvious signatures
    if s.startswith("PK") or s.startswith("%PDF"):
        return True
    # measure non-printable fraction
    printable = set(string.printable)
    non_printable = sum(1 for ch in s if ch not in printable)
    frac = non_printable / max(1, len(s))
    return frac > threshold


def ingest_documents_sync(
    document_ids, session_name=None, chunk_size_chars=2000, overlap=200
):
    """
    Synchronous ingestion for selected document IDs.
    WARNING: Blocking — run from shell / management command, not a web request.
    """
    if Document is None:
        return {
            "status": "error",
            "reason": "documents app or Document model not available",
        }

    docs_qs = Document.objects.filter(id__in=document_ids)
    if docs_qs.count() == 0:
        return {"status": "error", "reason": "no_valid_documents"}

    session = AITrainingSession.objects.create(
        status=AITrainingSession.STATUS_PROCESSING
    )
    session.documents.set(docs_qs)
    session.save()

    all_chunks = []
    total_chunks = 0

    for doc in docs_qs:
        file_field = getattr(doc, "file", None) or getattr(doc, "file_path", None)
        if not file_field:
            logger.warning("Document %s has no file field", getattr(doc, "id", None))
            continue
        storage_path = (
            file_field.name if hasattr(file_field, "name") else str(file_field)
        )
        filename = os.path.basename(storage_path)
        try:
            file_bytes = _read_file_bytes(storage_path)
            text = _extract_text_from_bytes(file_bytes, filename)
        except Exception:
            logger.exception(
                "Failed to read/extract for document %s", getattr(doc, "id", None)
            )
            text = ""

        if not text:
            logger.warning(
                "No text extracted for document %s (%s). Skipping.",
                getattr(doc, "id", None),
                filename,
            )
            continue

        chunks = _chunk_text(text, chunk_size_chars=chunk_size_chars, overlap=overlap)
        for i, chunk_text in enumerate(chunks):
            # sanitize whitespace
            sanitized = re.sub(r"\s+", " ", chunk_text or "").strip()
            # skip if looks binary or empty
            if not sanitized or _is_mostly_binary(sanitized):
                logger.warning(
                    "Skipping non-text or empty chunk for doc %s idx %s",
                    getattr(doc, "id", None),
                    i,
                )
                continue

            ai_chunk = AIChunk.objects.create(
                training_session=session,
                document=doc,
                chunk_index=i,
                text=sanitized,
                metadata={
                    "document_title": getattr(doc, "title", ""),
                    "document_id": getattr(doc, "id", None),
                },
            )
            all_chunks.append(
                {
                    "id": f"aichunk-{ai_chunk.id}",
                    "text": sanitized,
                    "metadata": {
                        "chunk_id": ai_chunk.id,
                        "document_id": getattr(doc, "id", None),
                        "title": getattr(doc, "title", ""),
                    },
                }
            )
        total_chunks += len(chunks)
        session.total_chunks = total_chunks
        session.save(update_fields=["total_chunks"])

    if chromadb is None:
        session.status = AITrainingSession.STATUS_FAILED
        session.error_message = "chromadb not installed"
        session.save(update_fields=["status", "error_message"])
        return {
            "status": "error",
            "reason": "chromadb_missing",
            "session_id": session.id,
        }

    # Initialize Chroma client (tolerant)
    client = None
    try:
        client = chromadb.Client()
    except Exception as e:
        logger.warning("chromadb.Client() failed, trying legacy Settings init: %s", e)
        try:
            if ChromaSettings is not None:
                chroma_settings = ChromaSettings(
                    chroma_db_impl="duckdb+parquet",
                    persist_directory=os.path.join(
                        settings.MEDIA_ROOT, "chroma_sessions"
                    ),
                )
                client = chromadb.Client(settings=chroma_settings)
            else:
                raise
        except Exception:
            logger.exception("Failed to init chroma client")
            session.status = AITrainingSession.STATUS_FAILED
            session.error_message = "failed_to_init_chroma"
            session.save(update_fields=["status", "error_message"])
            return {
                "status": "failed",
                "reason": "chroma_init_failed",
                "session_id": session.id,
            }

    # Embedding function (optional)
    try:
        emb_func = None
        if embedding_functions is not None:
            emb_func = embedding_functions.OpenAIEmbeddingFunction(
                api_key=getattr(settings, "OPENAI_API_KEY", None),
                model_name=getattr(
                    settings, "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
                ),
            )
    except Exception:
        emb_func = None

    collection_name = f"training_session_{session.id}"
    try:
        try:
            collection = client.get_collection(name=collection_name)
        except Exception:
            if emb_func is not None:
                collection = client.create_collection(
                    name=collection_name, embedding_function=emb_func
                )
            else:
                collection = client.create_collection(name=collection_name)
    except Exception:
        logger.exception("Failed to create/get chroma collection")
        session.status = AITrainingSession.STATUS_FAILED
        session.error_message = "failed_to_create_collection"
        session.save(update_fields=["status", "error_message"])
        return {
            "status": "failed",
            "reason": "chroma_collection_failed",
            "session_id": session.id,
        }

    # batch add
    batch_size = 32
    ids = []
    metadatas = []
    docs_texts = []

    for idx, chunk in enumerate(all_chunks):
        ids.append(chunk["id"])
        metadatas.append(chunk["metadata"])
        docs_texts.append(chunk["text"])

        session.chunks_processed = idx + 1
        session.save(update_fields=["chunks_processed"])

        if len(ids) >= batch_size:
            try:
                collection.add(ids=ids, metadatas=metadatas, documents=docs_texts)
            except Exception:
                logger.exception("Chroma add failed on batch")
            ids, metadatas, docs_texts = [], [], []

    if ids:
        try:
            collection.add(ids=ids, metadatas=metadatas, documents=docs_texts)
        except Exception:
            logger.exception("Chroma add failed on final batch")

    # Persist if available
    try:
        if hasattr(client, "persist"):
            client.persist()
    except Exception:
        logger.exception("Chroma persist failed (non-fatal)")

    session.status = AITrainingSession.STATUS_COMPLETED
    session.completed_at = timezone.now()
    session.metadata = session.metadata or {}
    session.metadata["chroma_collection"] = collection_name
    session.save(update_fields=["status", "completed_at", "metadata"])

    TrainedModel.objects.create(
        name=f"RAG model session #{session.id}",
        description=f"Chroma collection {collection_name}",
        training_session=session,
        model_metadata={"chroma_collection": collection_name},
        is_active=False,
    )

    return {"status": "completed", "session_id": session.id, "chunks": len(all_chunks)}
