# contents of services.py with only a single default changed: query default k increased to 30
import os
import logging
from django.conf import settings
import re

logger = logging.getLogger(__name__)

try:
    import chromadb

    try:
        from chromadb import PersistentClient
    except Exception:
        PersistentClient = None
    from chromadb.config import Settings as ChromaSettings
except Exception:
    chromadb = None
    PersistentClient = None
    ChromaSettings = None


def _is_mostly_printable(s: str, min_printable_ratio: float = 0.6) -> bool:
    if not s:
        return False
    printable = sum(1 for ch in s if ch.isprintable())
    return (printable / max(1, len(s))) >= min_printable_ratio and len(
        re.findall(r"[A-Za-z0-9]", s)
    ) >= 5


def _normalize_text(s: str) -> str:
    if not s:
        return ""
    t = re.sub(r"\s+", " ", s).strip().lower()
    return t[:5000]  # cap for hashing comparisons


class Retriever:
    def __init__(self, collection_name: str, persist_dir: str = None):
        if chromadb is None:
            raise RuntimeError("chromadb is not installed")

        self.collection_name = collection_name
        persist_directory = persist_dir or os.path.join(
            settings.MEDIA_ROOT, "chroma_sessions"
        )

        client = None
        if PersistentClient is not None:
            try:
                client = PersistentClient(path=persist_directory)
                logger.debug(
                    "Using chromadb.PersistentClient with path=%s", persist_directory
                )
            except Exception as e:
                logger.warning("PersistentClient init failed, falling back: %s", e)

        if client is None:
            try:
                client = chromadb.Client()
            except Exception as e:
                logger.warning(
                    "chromadb.Client() failed, attempting legacy Settings init: %s", e
                )
                if ChromaSettings is not None:
                    chroma_settings = ChromaSettings(
                        chroma_db_impl="duckdb+parquet",
                        persist_directory=persist_directory,
                    )
                    client = chromadb.Client(settings=chroma_settings)
                else:
                    raise RuntimeError("Failed to initialize chromadb client") from e

        self.client = client

        try:
            self.collection = self.client.get_collection(name=collection_name)
        except Exception as e:
            logger.exception("Failed to get collection %s: %s", collection_name, e)
            raise RuntimeError(
                f"Chroma collection '{collection_name}' not found or could not be opened"
            ) from e

    def query(self, text: str, k: int = 6):
        try:
            results = self.collection.query(query_texts=[text], n_results=k * 3)
            ids = results.get("ids", [[]])[0]
            docs = results.get("documents", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]
            distances = (
                results.get("distances", [[]])[0]
                if "distances" in results
                else [None] * len(ids)
            )

            # Build hits list and filter bad chunks (non-printable, very short, binary)
            raw_hits = []
            for i, _id in enumerate(ids):
                doc_text = docs[i] if i < len(docs) else ""
                meta = metadatas[i] if i < len(metadatas) else {}
                dist = distances[i] if i < len(distances) else None
                if not _is_mostly_printable(doc_text):
                    # skip chunks that are mostly non-printable or too short
                    continue
                raw_hits.append(
                    {
                        "id": _id,
                        "document_text": doc_text,
                        "metadata": meta,
                        "distance": dist,
                    }
                )

            # Deduplicate by normalized text (preserve best distance)
            seen = {}
            unique_hits = []
            for h in sorted(
                raw_hits, key=lambda x: (x.get("distance") is None, x.get("distance"))
            ):
                key = _normalize_text(h.get("document_text", ""))
                if not key:
                    continue
                if key in seen:
                    continue
                seen[key] = True
                unique_hits.append(h)
                if len(unique_hits) >= k:
                    break

            return unique_hits
        except Exception:
            logger.exception("Chroma query failed")
            return []
