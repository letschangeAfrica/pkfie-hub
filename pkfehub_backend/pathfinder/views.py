from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import (
    Program,
    PathfinderQuestion,
    PathfinderSession,
    PathfinderAnswer,
    PathfinderOption,
)
from .serializers import (
    ProgramSerializer,
    PathfinderQuestionSerializer,
    PathfinderSessionSerializer,
    PathfinderAnswerSerializer,
)
from django.shortcuts import get_object_or_404


class ProgramViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Program.objects.filter(is_active=True)
    serializer_class = ProgramSerializer
    filter_backends = [filters.SearchFilter]  # <-- Enable search
    search_fields = ["name", "code", "description"]  # <-- Fields to search


class PathfinderQuestionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PathfinderQuestion.objects.filter(is_active=True).order_by(
        "display_order"
    )
    serializer_class = PathfinderQuestionSerializer


class PathfinderSessionViewSet(viewsets.ModelViewSet):
    serializer_class = PathfinderSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PathfinderSession.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="answers")
    def add_answers(self, request, pk=None):
        session = self.get_object()
        answers_data = request.data.get("answers", [])
        created_answers = []
        for ans in answers_data:
            answer_serializer = PathfinderAnswerSerializer(
                data={**ans, "session": session.id}
            )
            answer_serializer.is_valid(raise_exception=True)
            answer_serializer.save()
            created_answers.append(answer_serializer.data)

        # --- RESULT CALCULATION LOGIC START ---
        answers = PathfinderAnswer.objects.filter(session=session)
        program_scores = {}
        for prog in Program.objects.filter(is_active=True):
            program_scores[prog.code] = 0

        for answer in answers:
            if answer.option:
                option = PathfinderOption.objects.get(id=answer.option.id)
                for code, weight in option.program_weights.items():
                    if code in program_scores:
                        program_scores[code] += weight

        # Find the highest score actually achieved by any program
        max_actual_score = max(program_scores.values()) if program_scores else 1
        if max_actual_score == 0:
            max_actual_score = 1

        program_results = []
        for code, score in program_scores.items():
            match_percent = min(100, round((score / max_actual_score) * 100))
            prog = Program.objects.filter(code=code).first()
            if prog:
                program_results.append(
                    {
                        "code": code,
                        "name": prog.name,
                        "description": prog.description,
                        "match": match_percent,
                    }
                )
        program_results = sorted(
            program_results, key=lambda x: x["match"], reverse=True
        )

        session.results = {"program_matches": program_results}
        session.completed = True
        session.save()
        # --- RESULT CALCULATION LOGIC END ---

        return Response(
            {
                "created": created_answers,
                "results": session.results,
            },
            status=status.HTTP_201_CREATED,
        )
