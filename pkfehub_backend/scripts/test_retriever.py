# Run via:
# python manage.py shell -c "exec(open('scripts/test_retriever.py').read()); test_query('What programs are offered?', k=8)"
import json
from ai_training.models import TrainedModel
from ai_training.services import Retriever


def test_query(q, k=8):
    tm = TrainedModel.objects.filter(is_active=True).order_by("-created_at").first()
    if not tm:
        print("No active TrainedModel found.")
        return
    collection = tm.model_metadata.get("chroma_collection")
    print("Using collection:", collection)
    r = Retriever(collection_name=collection)
    hits = r.query(q, k=k) or []
    print("Found", len(hits), "hits for query:", q)
    print(json.dumps(hits, indent=2))
