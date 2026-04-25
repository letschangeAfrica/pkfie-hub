import os
from django.conf import settings
from ai_training.models import AIChunk
from chromadb.config import Settings
import chromadb

PERSIST_DIR = os.path.join(settings.MEDIA_ROOT, "chroma_sessions")
COLLECTION_NAME = "training_session_6"
BATCH_SIZE = 256


def ensure_dir(p):
    os.makedirs(p, exist_ok=True)


def main():
    ensure_dir(PERSIST_DIR)
    print("Using chroma persist directory:", PERSIST_DIR)

    client = chromadb.Client(
        Settings(chroma_db_impl="duckdb+parquet", persist_directory=PERSIST_DIR)
    )
    try:
        existing = [c.name for c in client.list_collections()]
    except Exception as e:
        print("Failed to list collections:", e)
        existing = []

    print("Existing collections in that store:", existing)

    if COLLECTION_NAME in existing:
        print(
            f"Collection {COLLECTION_NAME} already exists in {PERSIST_DIR}. Will delete and recreate."
        )
        try:
            client.delete_collection(name=COLLECTION_NAME)
        except Exception as e:
            print("Failed to delete existing collection:", e)
            return

    qs = AIChunk.objects.all().order_by("id")
    total = qs.count()
    if total == 0:
        print("No AIChunk rows found to index. Exiting.")
        return

    print(f"Indexing {total} chunks into collection '{COLLECTION_NAME}'")
    coll = client.create_collection(name=COLLECTION_NAME)

    ids = []
    docs = []
    metas = []
    i = 0
    for chunk in qs.iterator():
        i += 1
        ids.append(f"aichunk-{chunk.id}")
        docs.append((chunk.text or "")[:30000])
        metas.append(
            {
                "chunk_id": getattr(chunk, "id", None),
                "document_id": getattr(getattr(chunk, "document", None), "id", None),
                "title": getattr(getattr(chunk, "document", None), "title", None),
            }
        )
        if len(ids) >= BATCH_SIZE:
            coll.add(documents=docs, ids=ids, metadatas=metas)
            ids = []
            docs = []
            metas = []
            print(f"Indexed {i}/{total} chunks...")

    if ids:
        coll.add(documents=docs, ids=ids, metadatas=metas)

    print(
        "Done. Collections in that store now:",
        [c.name for c in client.list_collections()],
    )
    print("Chroma data stored at:", PERSIST_DIR)


if __name__ == "__main__":
    main()
