from rest_framework import serializers
from .models import (
    HandbookSection,
    HandbookContentBlock,
    HandbookTable,
    HandbookTableRow,
)


class HandbookTableRowSerializer(serializers.ModelSerializer):
    class Meta:
        model = HandbookTableRow
        fields = ["values", "order"]


class HandbookTableSerializer(serializers.ModelSerializer):
    rows = HandbookTableRowSerializer(many=True)

    class Meta:
        model = HandbookTable
        fields = ["title", "rows", "order"]


class HandbookContentBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = HandbookContentBlock
        fields = ["title", "body", "order"]


class HandbookSectionSerializer(serializers.ModelSerializer):
    blocks = HandbookContentBlockSerializer(many=True)
    tables = HandbookTableSerializer(many=True)

    class Meta:
        model = HandbookSection
        fields = ["key", "title", "icon", "blocks", "tables", "order"]
