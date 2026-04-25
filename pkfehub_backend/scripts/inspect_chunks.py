# usage: python manage.py shell < scripts/inspect_chunks.py
# This script prints chunk previews for selected Document IDs.
from documents.models import Document


def print_doc_chunks(doc_id, max_chunks=12, preview_chars=600):
    try:
        d = Document.objects.get(id=doc_id)
    except Document.DoesNotExist:
        print(f"Document {doc_id} not found.")
        return
    print("=" * 80)
    print(f"DOC {d.id}: {d.title}")
    total = d.chunks.count()
    print(f"Total chunks: {total}")
    print("-" * 80)
    for i, c in enumerate(d.chunks.all()[:max_chunks], start=1):
        text = (c.document_text or "").replace("\n", " ")
        preview = text[:preview_chars]
        print(f"[{i}] chunk_id={c.id} preview: {preview}")
    print("\n")


if __name__ == "__main__":
    # Edit or extend this list with other IDs you want to inspect
    ids_to_inspect = [6, 9]
    for doc_id in ids_to_inspect:
        print_doc_chunks(doc_id)
