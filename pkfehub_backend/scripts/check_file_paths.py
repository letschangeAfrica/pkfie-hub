# usage: python manage.py shell < scripts/check_file_paths.py
from documents.models import Document
import os


def show(doc_id):
    try:
        d = Document.objects.get(id=doc_id)
    except Document.DoesNotExist:
        print(f"Document {doc_id} not found.")
        return
    fa = getattr(d, "file", None)
    print("=" * 60)
    print(f"DOC {d.id}: {d.title}")
    print("file attr:", fa)
    print("file_name:", getattr(d, "file_name", None))
    print("file_path field:", getattr(d, "file_path", None))
    if hasattr(fa, "path"):
        print("file.path:", fa.path)
        print("exists:", os.path.exists(fa.path))
    else:
        # assume MEDIA_ROOT + file_path or file field string
        candidate = getattr(d, "file_path", None) or getattr(d, "file", None)
        if candidate:
            candidate_path = os.path.join(os.getcwd(), "media", str(candidate))
            print("candidate local path:", candidate_path)
            print("exists:", os.path.exists(candidate_path))
    print("=" * 60, "\n")


if __name__ == "__main__":
    for id_ in (6, 9):
        show(id_)
