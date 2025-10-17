from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProgramViewSet,
    PathfinderQuestionViewSet,
    PathfinderSessionViewSet,
)

router = DefaultRouter()
router.register(r"programs", ProgramViewSet, basename="program")
router.register(r"questions", PathfinderQuestionViewSet, basename="question")
router.register(r"sessions", PathfinderSessionViewSet, basename="session")

urlpatterns = [
    path("", include(router.urls)),
]
