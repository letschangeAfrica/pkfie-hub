import os
import io
import logging
from celery import shared_task
from django.conf import settings
from django.core.files.storage import default_storage
from django.utils import timezone

from .models import AITrainingSession, AIChunk, TrainedModel

# Be defensive: documents app must exist in your project
try:
    from documents.models import Document
except Exception:
    Document = None

logger = logging.getLogger(__name__)

# Optional libs
try:
    import PyPDF2
except Exception:
    PyPDF2 = None

try:
    import docx
except Exception:
    docx = None

# chroma + embeddings helper (Chroma local PoC)
try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    from chromadb.utils import embedding_functions
except Exception:
    chromadb = None
    embedding_functions = None


def _read_file_bytes(storage_path: str) -> bytes:
    with default_storage.open(storage_path, "rb") as fh:
        return fh.read()


def _extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    name_lower = filename.lower()
    if name_lower.endswith(".pdf") and PyPDF2:
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            pages = []
            for p in reader.pages:
                pages.append(p.extract_text() or "")
            return "\n\n".join(pages)
        except Exception:
            logger.exception("PDF extraction failed")
            return ""
    if (name_lower.endswith(".docx") or name_lower.endswith(".doc")) and docx:
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            return "\n\n".join(p.text for p in doc.paragraphs)
        except Exception:
            logger.exception("DOCX extraction failed")
            return ""
    # fallback: try decode as utf-8
    try:
        return file_bytes.decode("utf-8", errors="ignore")
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


@shared_task(bind=True)
def ingest_and_index_documents(self, training_session_id):
    """
    Celery task that:
      - Extracts text from each Document in a session
      - Chunks text and creates AIChunk DB rows
      - Adds vectors to a Chroma collection (one collection per session)
      - Creates a TrainedModel record pointing to the collection
    """
    try:
        session = AITrainingSession.objects.get(pk=training_session_id)
    except AITrainingSession.DoesNotExist:
        logger.error("Training session not found: %s", training_session_id)
        return {"status": "error", "reason": "session_not_found"}

    session.status = AITrainingSession.STATUS_PROCESSING
    session.chunks_processed = 0
    session.total_chunks = 0
    session.save(update_fields=["status", "chunks_processed", "total_chunks"])

    docs = list(session.documents.all())
    all_chunks = []

    for doc in docs:
        # adapt to your Document model's file field name; common names: file, file_field, upload
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
                "No text extracted for document %s", getattr(doc, "id", None)
            )
            continue

        chunks = _chunk_text(text)
        session.total_chunks += len(chunks)
        session.save(update_fields=["total_chunks"])

        for i, chunk_text in enumerate(chunks):
            ai_chunk = AIChunk.objects.create(
                training_session=session,
                document=doc,
                chunk_index=i,
                text=chunk_text,
                metadata={
                    "document_title": getattr(doc, "title", ""),
                    "document_id": getattr(doc, "id", None),
                },
            )
            # prepare for vector store
            all_chunks.append(
                {
                    "id": f"aichunk-{ai_chunk.id}",
                    "text": chunk_text,
                    "metadata": {
                        "chunk_id": ai_chunk.id,
                        "document_id": getattr(doc, "id", None),
                        "title": getattr(doc, "title", ""),
                    },
                }
            )

    # ensure chromadb installed for PoC
    if chromadb is None:
        session.status = AITrainingSession.STATUS_FAILED
        session.error_message = "chromadb library not installed"
        session.save(update_fields=["status", "error_message"])
        return {"status": "failed", "reason": "chroma_not_installed"}

    try:
        chroma_settings = ChromaSettings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=os.path.join(settings.MEDIA_ROOT, "chroma_sessions"),
        )
        client = chromadb.Client(settings=chroma_settings)
    except Exception:
        logger.exception("Failed to init chroma client")
        session.status = AITrainingSession.STATUS_FAILED
        session.error_message = "failed_to_init_chroma"
        session.save(update_fields=["status", "error_message"])
        return {"status": "failed", "reason": "chroma_init_failed"}

    # Embedding function: uses OpenAI to compute embeddings via Chroma helper
    try:
        emb_func = embedding_functions.OpenAIEmbeddingFunction(
            api_key=getattr(settings, "OPENAI_API_KEY", os.getenv("OPENAI_API_KEY")),
            model_name=getattr(
                settings, "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
            ),
        )
    except Exception:
        emb_func = None

    collection_name = f"training_session_{session.id}"
    try:
        collection = client.get_collection(name=collection_name)
    except Exception:
        collection = client.create_collection(
            name=collection_name, embedding_function=emb_func
        )

    # batch add
    batch_size = 32
    ids = []
    metadatas = []
    docs_texts = []

    for idx, chunk in enumerate(all_chunks):
        ids.append(chunk["id"])
        metadatas.append(chunk["metadata"])
        docs_texts.append(chunk["text"])

        # update progress
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

    try:
        client.persist()
    except Exception:
        logger.exception("Chroma persist failed")

    session.status = AITrainingSession.STATUS_COMPLETED
    session.completed_at = timezone.now()
    session.metadata = session.metadata or {}
    session.metadata["chroma_collection"] = collection_name
    session.save(update_fields=["status", "completed_at", "metadata"])

    # create TrainedModel pointing to this collection
    TrainedModel.objects.create(
        name=f"RAG model session #{session.id}",
        description=f"Vector store (Chroma) collection {collection_name}",
        training_session=session,
        model_metadata={"chroma_collection": collection_name},
        is_active=False,
    )

    return {"status": "completed", "chunks": len(all_chunks)}
