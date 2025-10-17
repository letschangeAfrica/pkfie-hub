from django.db import models


class HandbookSection(models.Model):
    SECTION_CHOICES = [
        ("admissions", "Admissions & Enrollment"),
        ("academics", "Academic Programs"),
        ("fees", "Tuition & Fees"),
        ("policies", "Policies & Procedures"),
        ("campus", "Campus Life"),
        ("resources", "Student Resources"),
    ]
    key = models.CharField(max_length=32, unique=True, choices=SECTION_CHOICES)
    title = models.CharField(max_length=128)
    icon = models.CharField(max_length=64, default="fas fa-book")
    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.title


class HandbookContentBlock(models.Model):
    section = models.ForeignKey(
        HandbookSection, related_name="blocks", on_delete=models.CASCADE
    )
    title = models.CharField(max_length=128, blank=True)
    body = models.TextField(help_text="Supports Markdown or HTML.")
    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.section.title}: {self.title or 'Content'}"


class HandbookTable(models.Model):
    section = models.ForeignKey(
        HandbookSection, related_name="tables", on_delete=models.CASCADE
    )
    title = models.CharField(max_length=128, blank=True)
    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.section.title}: Table - {self.title}"


class HandbookTableRow(models.Model):
    table = models.ForeignKey(
        HandbookTable, related_name="rows", on_delete=models.CASCADE
    )
    values = models.JSONField(help_text="List of cell values in order")
    order = models.PositiveIntegerField(default=0)
