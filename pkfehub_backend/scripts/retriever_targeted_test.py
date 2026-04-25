# scripts/retriever_targeted_test.py
# Run via:
# python manage.py shell -c "exec(open('scripts/retriever_targeted_test.py').read()); run_tests()"
import json
from ai_training.models import TrainedModel
from ai_training.services import Retriever


def run_query(q, k=8):
    tm = TrainedModel.objects.filter(is_active=True).order_by("-created_at").first()
    if not tm:
        print("No active TrainedModel found.")
        return []
    collection = tm.model_metadata.get("chroma_collection")
    print("Using collection:", collection)
    r = Retriever(collection_name=collection)
    hits = r.query(q, k=k) or []
    print(f"Query: {q!r} -> {len(hits)} hits (k={k})")
    print(json.dumps(hits, indent=2)[:4000])
    return hits


def run_tests():
    # General question (what you already ran)
    run_query("What programs are offered?", k=8)
    # Try exact program phrase found in the Booklet
    run_query("COMPUTER ENGINEERING TECHNOLOGY", k=8)
    run_query("BUSINESS ADMINISTRATION", k=8)
    # Increase k to check whether relevant chunks show up further down
    run_query("What programs are offered?", k=30)
