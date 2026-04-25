from django.db import models

# Reference the documents app's Document model by string to avoid import cycles.
DocumentRef = "documents.Document"


class AITrainingSession(models.Model):
    STATUS_PENDING = "Pending"
    STATUS_PROCESSING = "Processing"
    STATUS_COMPLETED = "Completed"
    STATUS_FAILED = "Failed"

    STATUS_CHOICES = (
        (STATUS_PENDING, STATUS_PENDING),
        (STATUS_PROCESSING, STATUS_PROCESSING),
        (STATUS_COMPLETED, STATUS_COMPLETED),
        (STATUS_FAILED, STATUS_FAILED),
    )

    documents = models.ManyToManyField(DocumentRef, related_name="ai_training_sessions")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    chunks_processed = models.IntegerField(default=0)
    total_chunks = models.IntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "ai_training_sessions"
        verbose_name = "AI Training Session"
        verbose_name_plural = "AI Training Sessions"

    def __str__(self):
        return f"Training Session {self.id} - {self.status}"


class TrainedModel(models.Model):
    """
    Represents a "trained artifact" which for RAG means a vector collection + metadata.
    """

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    training_session = models.ForeignKey(
        AITrainingSession, on_delete=models.CASCADE, related_name="trained_models"
    )
    model_metadata = models.JSONField(
        default=dict, blank=True
    )  # e.g. {'chroma_collection': 'training_session_1'}
    accuracy_score = models.FloatField(blank=True, null=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "trained_models"
        verbose_name = "Trained Model"
        verbose_name_plural = "Trained Models"

    def __str__(self):
        return self.name


class AIChunk(models.Model):
    """
    Stores the text chunks created during ingestion. This is separate from any
    DocumentChunk model you may already have in the documents app to avoid
    schema mismatches. If you prefer reusing your existing chunk model, we can adapt tasks.
    """

    training_session = models.ForeignKey(
        AITrainingSession, on_delete=models.CASCADE, related_name="chunks"
    )
    document = models.ForeignKey(
        DocumentRef, on_delete=models.CASCADE, related_name="ai_chunks"
    )
    chunk_index = models.IntegerField(default=0)
    text = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_chunks"
        verbose_name = "AI Chunk"
        verbose_name_plural = "AI Chunks"
        ordering = ["training_session", "chunk_index"]

    def __str__(self):
        return (
            f"Chunk {self.id} (doc:{self.document_id} sess:{self.training_session_id})"
        )
