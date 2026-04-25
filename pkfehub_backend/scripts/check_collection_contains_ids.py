# scripts/check_collection_contains_ids.py
# Run via:
# python manage.py shell -c "exec(open('scripts/check_collection_contains_ids.py').read()); check_collection(['6-chunk-1','6-chunk-2','9-chunk-1','9-chunk-2','9-chunk-3','9-chunk-4','9-chunk-5'])"
import json, os
import chromadb
from ai_training.models import TrainedModel


def get_collection_name():
    tm = TrainedModel.objects.filter(is_active=True).order_by("-created_at").first()
    if tm and isinstance(tm.model_metadata, dict):
        return tm.model_metadata.get("chroma_collection")
    return None


def check_collection(ids_to_check=None):
    col_name = get_collection_name()
    print("Using collection:", col_name)
    client = chromadb.Client()
    try:
        col = client.get_collection(name=col_name)
    except Exception as e:
        print("Could not open collection:", e)
        return
    print("Collection opened.")
    # print total number of items if API supports it
    try:
        info = col.count()
        print("Collection count:", info)
    except Exception:
        pass
    if not ids_to_check:
        print("No ids provided to check.")
        return
    print("Checking ids presence (sample):", ids_to_check)
    try:
        # many chroma versions support get(ids=[...])
        res = col.get(ids=ids_to_check)
        print("Result keys:", list(res.keys()))
        print(json.dumps(res, indent=2, default=str)[:4000])
    except Exception as e:
        print("col.get(ids=...) failed:", e)
        # fallback: try query by metadata if available
        for _id in ids_to_check:
            try:
                item = col.get(ids=[_id])
                print(f"Found item for id {_id}: keys {list(item.keys())}")
            except Exception as e2:
                print(f"Not found or get failed for id {_id}: {e2}")

    # Print a small sample from collection to inspect document titles
    try:
        sample = col.get(n_results=10)  # some versions allow n_results
        print("Sample from collection (truncated):")
        print(json.dumps(sample, indent=2)[:4000])
    except Exception:
        pass
