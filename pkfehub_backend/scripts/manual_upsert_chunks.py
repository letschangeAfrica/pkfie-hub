# Run via:
# python manage.py shell -c "exec(open('scripts/manual_upsert_chunks_safe_v2.py').read()); manual_upsert([6,9])"
import os, time
from documents.models import Document

# New OpenAI client import for openai>=1.0.0
from openai import OpenAI
import chromadb

# Config (override with env vars if needed)
EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
CHUNK_SIZE = int(os.getenv("MANUAL_CHUNK_SIZE", "800"))  # naive word-based chunk size
CHUNK_OVERLAP = int(os.getenv("MANUAL_CHUNK_OVERLAP", "100"))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set in environment")

# Initialize new OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

# Chromadb client (assumes chromadb is reachable locally)
chroma_client = chromadb.Client()

# Try to discover the collection name from an active TrainedModel if available
collection_name = None
try:
    from ai_training.models import TrainedModel

    tm = TrainedModel.objects.filter(is_active=True).order_by("-created_at").first()
    if tm and isinstance(tm.model_metadata, dict):
        collection_name = tm.model_metadata.get("chroma_collection")
except Exception:
    collection_name = None

if not collection_name:
    collection_name = os.getenv("MANUAL_CHROMA_COLLECTION", "manual_manual_collection")


def _chunk_text_naive(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    words = text.split()
    if not words:
        return []
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i : i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += chunk_size - overlap
    return chunks


def _embed_texts(texts):
    embeddings = []
    BATCH = 16
    for i in range(0, len(texts), BATCH):
        batch = texts[i : i + BATCH]
        # New client usage for openai>=1.0.0
        resp = client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
        for item in resp.data:
            # item may be a dict-like object
            emb = (
                item.get("embedding")
                if isinstance(item, dict)
                else getattr(item, "embedding", None)
            )
            if emb is None:
                raise RuntimeError("Embedding API returned unexpected format")
            embeddings.append(emb)
        time.sleep(0.2)
    return embeddings


def manual_upsert(doc_ids):
    # Ensure collection (get or create)
    try:
        collection = chroma_client.get_collection(name=collection_name)
    except Exception:
        collection = chroma_client.create_collection(name=collection_name)

    total_upserted = 0
    for doc_id in doc_ids:
        d = Document.objects.get(id=doc_id)
        path = (
            d.file.path
            if hasattr(d.file, "path")
            else os.path.join(os.getcwd(), "media", str(d.file))
        )
        print("Processing doc", d.id, d.title, "path:", path)
        if not os.path.exists(path):
            print("  file not found:", path)
            continue

        # Extract text with PyMuPDF
        try:
            import fitz

            pdf = fitz.open(path)
            pages_text = [p.get_text("text") or "" for p in pdf]
            full_text = "\n\n".join(pages_text).strip()
        except Exception as e:
            print("  PyMuPDF extraction failed:", e)
            full_text = None

        if not full_text:
            print("  No extractable text found with PyMuPDF, skipping.")
            continue

        # Chunk text
        chunks = _chunk_text_naive(full_text)
        print(f"  Created {len(chunks)} chunks from doc {d.id}")

        if not chunks:
            print("  No chunks produced, skipping.")
            continue

        # Compute embeddings using new OpenAI client
        try:
            embeddings = _embed_texts(chunks)
        except Exception as e:
            print("  Embedding error:", e)
            continue

        # Prepare ids/metadatas/documents
        ids = [f"{d.id}-chunk-{i+1}" for i in range(len(chunks))]
        metadatas = [
            {"document_id": d.id, "document_title": d.title, "chunk_index": i + 1}
            for i in range(len(chunks))
        ]

        # Upsert into chroma (try upsert then fall back to add)
        try:
            collection.upsert(
                ids=ids, metadatas=metadatas, documents=chunks, embeddings=embeddings
            )
            print(
                f"  Upserted {len(ids)} vectors into collection '{collection_name}' (upsert)"
            )
        except TypeError:
            try:
                collection.add(
                    ids=ids,
                    metadatas=metadatas,
                    documents=chunks,
                    embeddings=embeddings,
                )
                print(
                    f"  Added {len(ids)} vectors into collection '{collection_name}' (add)"
                )
            except Exception as e:
                print("  Chroma add failed:", e)
                continue
        except Exception as e:
            print("  Chroma upsert failed:", e)
            continue

        total_upserted += len(ids)

    print("Manual upsert finished. total_upserted=", total_upserted)


# Expose function for manage.py shell execution
def manual_upsert_entry(ids):
    manual_upsert(ids)
