from django.contrib import admin
from .models import (
    HandbookSection,
    HandbookContentBlock,
    HandbookTable,
    HandbookTableRow,
)


class HandbookContentBlockInline(admin.TabularInline):
    model = HandbookContentBlock
    extra = 1


class HandbookTableRowInline(admin.TabularInline):
    model = HandbookTableRow
    extra = 1


class HandbookTableAdmin(admin.ModelAdmin):
    inlines = [HandbookTableRowInline]
    list_display = ["title", "section"]


class HandbookSectionAdmin(admin.ModelAdmin):
    inlines = [HandbookContentBlockInline]
    list_display = ["title", "key", "order"]
    ordering = ["order"]
    fields = ["key", "title", "icon", "order"]


admin.site.register(HandbookSection, HandbookSectionAdmin)
admin.site.register(HandbookTable, HandbookTableAdmin)
