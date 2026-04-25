from django.core.management.base import BaseCommand, CommandError
from ai_training.processor import ingest_documents_sync


class Command(BaseCommand):
    help = "Ingest documents into a Chroma collection synchronously. Usage: python manage.py ingest_documents --ids 1 2 3"

    def add_arguments(self, parser):
        parser.add_argument(
            "--ids",
            nargs="+",
            type=int,
            required=True,
            help="Document IDs to ingest (space separated).",
        )
        parser.add_argument(
            "--chunk-size",
            type=int,
            default=2000,
            help="Chunk size in characters",
        )
        parser.add_argument(
            "--overlap",
            type=int,
            default=200,
            help="Chunk overlap in characters",
        )

    def handle(self, *args, **options):
        ids = options["ids"]
        chunk_size = options["chunk_size"]
        overlap = options["overlap"]

        self.stdout.write(
            self.style.NOTICE(f"Starting synchronous ingestion for document ids: {ids}")
        )
        result = ingest_documents_sync(
            ids, chunk_size_chars=chunk_size, overlap=overlap
        )

        if result.get("status") == "completed":
            self.stdout.write(
                self.style.SUCCESS(
                    f"Ingestion completed. session_id={result.get('session_id')} chunks={result.get('chunks')}"
                )
            )
        else:
            self.stdout.write(self.style.ERROR(f"Ingestion failed: {result}"))
            raise CommandError("Ingestion did not complete")
