from django.db import models
from users.models import User


class DocumentCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    parent_category = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="subcategories",
    )
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "document_categories"
        verbose_name = "Document Category"
        verbose_name_plural = "Document Categories"
        ordering = ("display_order", "name")

    def __str__(self):
        return self.name


class Document(models.Model):
    STATUS_CHOICES = (("Draft", "Draft"), ("Published", "Published"))

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to="documents/")
    file_name = models.CharField(max_length=500)
    file_path = models.CharField(max_length=1000, blank=True, null=True)
    file_size = models.IntegerField()
    file_type = models.CharField(max_length=50)
    category = models.ForeignKey(
        DocumentCategory, on_delete=models.CASCADE, related_name="documents"
    )
    uploaded_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="uploaded_documents"
    )
    version = models.CharField(max_length=20, default="1.0")
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="approved_documents",
    )
    approval_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Draft")
    is_active = models.BooleanField(default=True)
    effective_date = models.DateField(blank=True, null=True)
    expiration_date = models.DateField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "documents"
        verbose_name = "Document"
        verbose_name_plural = "Documents"

    def save(self, *args, **kwargs):
        # Set file_name, file_path, file_size, file_type automatically if file is present
        if self.file:
            self.file_name = self.file.name
            self.file_path = self.file.name
            self.file_size = self.file.size
            self.file_type = self.file.name.split(".")[-1].lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class DocumentChunk(models.Model):
    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name="chunks"
    )
    chunk_text = models.TextField()
    chunk_index = models.IntegerField()
    page_number = models.IntegerField(blank=True, null=True)
    embedding_id = models.CharField(max_length=100, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "document_chunks"
        verbose_name = "Document Chunk"
        verbose_name_plural = "Document Chunks"
        ordering = ["chunk_index"]

    def __str__(self):
        return f"Chunk {self.chunk_index} of {self.document.title}"


class DocumentView(models.Model):
    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name="views"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="document_views"
    )
    viewed_at = models.DateTimeField(auto_now_add=True)
    time_spent = models.IntegerField(blank=True, null=True)  # in seconds

    class Meta:
        db_table = "document_views"
        verbose_name = "Document View"
        verbose_name_plural = "Document Views"

    def __str__(self):
        return f"{self.user.email} viewed {self.document.title}"
