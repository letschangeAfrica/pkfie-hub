# pathfinder/models.py
from django.db import models
from users.models import User


class Program(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField()
    duration_years = models.IntegerField()
    requirements = models.TextField()
    career_opportunities = models.TextField(blank=True, null=True)
    tuition_fee = models.DecimalField(max_digits=10, decimal_places=2)
    additional_fees = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "programs"
        verbose_name = "Program"
        verbose_name_plural = "Programs"

    def __str__(self):
        return f"{self.code} - {self.name}"


class ProgramFeature(models.Model):
    program = models.ForeignKey(
        Program, on_delete=models.CASCADE, related_name="features"
    )
    feature_name = models.CharField(max_length=100)
    feature_description = models.TextField(blank=True, null=True)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "program_features"
        verbose_name = "Program Feature"
        verbose_name_plural = "Program Features"
        ordering = ["display_order"]

    def __str__(self):
        return f"{self.program.name} - {self.feature_name}"


class PathfinderQuestion(models.Model):
    QUESTION_TYPE_CHOICES = (
        ("multiple_choice", "Multiple Choice"),
        ("rating", "Rating"),
        ("text", "Text"),
    )

    question_text = models.TextField()
    question_type = models.CharField(max_length=50, choices=QUESTION_TYPE_CHOICES)
    display_order = models.IntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pathfinder_questions"
        verbose_name = "Pathfinder Question"
        verbose_name_plural = "Pathfinder Questions"
        ordering = ["display_order"]

    def __str__(self):
        return f"Q{self.display_order}: {self.question_text[:50]}..."


class PathfinderOption(models.Model):
    question = models.ForeignKey(
        PathfinderQuestion, on_delete=models.CASCADE, related_name="options"
    )
    option_text = models.TextField()
    option_value = models.CharField(max_length=100)
    program_weights = models.JSONField(default=dict)  # Maps to program IDs with weights
    display_order = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pathfinder_options"
        verbose_name = "Pathfinder Option"
        verbose_name_plural = "Pathfinder Options"
        ordering = ["display_order"]

    def __str__(self):
        return f"{self.question.display_order}.{self.display_order}: {self.option_text[:50]}..."


class PathfinderSession(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="pathfinder_sessions"
    )
    completed = models.BooleanField(default=False)
    results = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "pathfinder_sessions"
        verbose_name = "Pathfinder Session"
        verbose_name_plural = "Pathfinder Sessions"

    def __str__(self):
        return f"Session {self.id} - {self.user.email}"


class PathfinderAnswer(models.Model):
    session = models.ForeignKey(
        PathfinderSession, on_delete=models.CASCADE, related_name="answers"
    )
    question = models.ForeignKey(PathfinderQuestion, on_delete=models.CASCADE)
    option = models.ForeignKey(
        PathfinderOption, on_delete=models.CASCADE, blank=True, null=True
    )
    answer_value = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pathfinder_answers"
        verbose_name = "Pathfinder Answer"
        verbose_name_plural = "Pathfinder Answers"

    def __str__(self):
        return f"Answer for Q{self.question.display_order} in session {self.session.id}"
