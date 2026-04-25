from django.core.management.base import BaseCommand, CommandError
from ai_training.models import AIChunk, TrainedModel
import chromadb
from chromadb.config import Settings

BATCH_SIZE = 256


class Command(BaseCommand):
    help = "Rebuild a chromadb collection from AIChunk rows. Usage: manage.py rebuild_chroma --model-id 5 OR --collection my_collection"

    def add_arguments(self, parser):
        parser.add_argument(
            "--model-id",
            type=int,
            help="TrainedModel id to use (reads chroma_collection from model_metadata)",
        )
        parser.add_argument(
            "--collection", type=str, help="Explicit collection name to create"
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="If collection exists, delete and recreate",
        )

    def handle(self, *args, **options):
        model_id = options.get("model_id")
        collection_name = options.get("collection")
        force = options.get("force", False)

        if not model_id and not collection_name:
            raise CommandError("Please provide --model-id or --collection")

        if model_id:
            try:
                tm = TrainedModel.objects.get(id=model_id)
            except TrainedModel.DoesNotExist:
                raise CommandError(f"TrainedModel with id={model_id} not found")
            md = tm.model_metadata or {}
            collection_name = collection_name or md.get("chroma_collection")
            if not collection_name:
                raise CommandError(
                    "TrainedModel.model_metadata does not contain 'chroma_collection'"
                )

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"Rebuilding chroma collection: {collection_name}"
            )
        )

        # Initialize chromadb client with defaults; adjust Settings if required
        try:
            client = chromadb.Client()
        except Exception as e:
            raise CommandError(f"Failed to initialize chromadb client: {e}")

        try:
            existing = [c.name for c in client.list_collections()]
        except Exception:
            existing = []

        if collection_name in existing:
            if force:
                self.stdout.write("Deleting existing collection (force=True)")
                try:
                    client.delete_collection(name=collection_name)
                except Exception as e:
                    raise CommandError(f"Failed to delete existing collection: {e}")
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"Collection {collection_name} already exists. Use --force to recreate. Exiting."
                    )
                )
                return

        qs = AIChunk.objects.all().order_by("id")
        total = qs.count()
        if total == 0:
            raise CommandError(
                "No AIChunk rows found to index. Make sure documents were ingested first."
            )

        self.stdout.write(
            f"Indexing {total} chunks into collection '{collection_name}'"
        )

        try:
            coll = client.create_collection(name=collection_name)
        except Exception as e:
            raise CommandError(f"Failed to create collection: {e}")

        ids = []
        docs = []
        metas = []
        i = 0
        for chunk in qs.iterator():
            i += 1
            chunk_id = f"aichunk-{chunk.id}"
            text = (chunk.text or "")[:30000]  # safety cap
            meta = {
                "chunk_id": getattr(chunk, "id", None),
                "document_id": getattr(getattr(chunk, "document", None), "id", None),
                "title": getattr(getattr(chunk, "document", None), "title", None),
            }
            ids.append(chunk_id)
            docs.append(text)
            metas.append(meta)

            if len(ids) >= BATCH_SIZE:
                try:
                    coll.add(documents=docs, ids=ids, metadatas=metas)
                except Exception as e:
                    raise CommandError(f"Failed to add batch ending at {i}: {e}")
                ids = []
                docs = []
                metas = []
                self.stdout.write(f"Indexed {i}/{total} chunks...")

        if ids:
            try:
                coll.add(documents=docs, ids=ids, metadatas=metas)
            except Exception as e:
                raise CommandError(f"Failed to add final batch: {e}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully created collection '{collection_name}' with ~{total} chunks"
            )
        )
