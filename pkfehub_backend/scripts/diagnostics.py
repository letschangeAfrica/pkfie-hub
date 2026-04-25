import json
from ai_training.models import AIChunk
from django.db.models import Count

doc_model = AIChunk._meta.get_field("document").remote_field.model

out = {}
out["doc_model"] = doc_model.__module__ + "." + doc_model.__name__

# file fields (if any) on the Document model
file_fields = [
    f.name
    for f in doc_model._meta.get_fields()
    if getattr(f, "get_internal_type", lambda: None)() in ("FileField", "ImageField")
]
out["file_fields"] = file_fields

# documents list (id, title, created_at, file field values if present)
docs = []
for d in doc_model.objects.all():
    info = {
        "id": d.pk,
        "title": getattr(d, "title", None),
        "created_at": getattr(d, "created_at", None),
    }
    for f in file_fields:
        val = getattr(d, f, None)
        info[f] = str(val) if val else None
    docs.append(info)
out["documents"] = docs

# documents that produced chunks and counts
docs_with_counts = list(
    AIChunk.objects.values("document__id", "document__title")
    .annotate(count=Count("id"))
    .order_by("-count")
)
out["docs_with_counts"] = docs_with_counts

# list document ids that have no chunks
docs_with_chunks_ids = set(
    [r["document__id"] for r in docs_with_counts if r["document__id"] is not None]
)
no_chunks = [d for d in docs if d["id"] not in docs_with_chunks_ids]
out["documents_with_no_chunks"] = no_chunks

# sample chunk previews for top documents (up to 3 each)
samples = {}
for r in docs_with_counts[:10]:
    doc_id = r["document__id"]
    chs = AIChunk.objects.filter(document__id=doc_id)[:3]
    samples[doc_id] = [(c.text or "")[:800].replace("\n", " ") for c in chs]
out["sample_chunks"] = samples

print(json.dumps(out, default=str, ensure_ascii=False, indent=2))
