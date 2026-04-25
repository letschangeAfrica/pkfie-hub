from django.urls import path, include
from .views_rag import ChatRAGAPIView
from rest_framework.routers import DefaultRouter
from .views import (
    AITrainingSessionViewSet,
    TrainedModelViewSet,
    DocumentTrainingViewSet,
)

router = DefaultRouter()
router.register(
    r"training-sessions", AITrainingSessionViewSet, basename="training-session"
)
router.register(r"trained-models", TrainedModelViewSet, basename="trained-model")

doc_router = DefaultRouter()
doc_router.register(
    r"documents/train", DocumentTrainingViewSet, basename="document-train"
)

urlpatterns = [
    path("", include(router.urls)),
    path("", include(doc_router.urls)),
    path("chat/ai_rag/", ChatRAGAPIView.as_view(), name="ai_rag"),
]
