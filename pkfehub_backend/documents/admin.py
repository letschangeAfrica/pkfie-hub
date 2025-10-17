from django.contrib import admin
from .models import DocumentCategory, Document, DocumentChunk, DocumentView


class DocumentCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "parent_category", "display_order", "is_active")
    list_filter = ("is_active", "parent_category")
    search_fields = ("name", "description")
    ordering = ("display_order", "name")


class DocumentAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "uploaded_by",
        "is_approved",
        "is_active",
        "created_at",
    )
    list_filter = ("category", "is_approved", "is_active", "file_type")
    search_fields = ("title", "description", "uploaded_by__email")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"


class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ("document", "chunk_index", "page_number", "created_at")
    list_filter = ("document",)
    search_fields = ("document__title", "chunk_text")
    readonly_fields = ("created_at",)


class DocumentViewAdmin(admin.ModelAdmin):
    list_display = ("document", "user", "viewed_at", "time_spent")
    list_filter = ("viewed_at",)
    search_fields = ("document__title", "user__email")
    readonly_fields = ("viewed_at",)
    date_hierarchy = "viewed_at"


admin.site.register(DocumentCategory, DocumentCategoryAdmin)
admin.site.register(Document, DocumentAdmin)
admin.site.register(DocumentChunk, DocumentChunkAdmin)
admin.site.register(DocumentView, DocumentViewAdmin)
