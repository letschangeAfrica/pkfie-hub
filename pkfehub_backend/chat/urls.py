from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConversationViewSet,
    MessageViewSet,
    AIModelViewSet,
    AIChatAPIView,
    ChatStatsAPIView,
)

router = DefaultRouter()
router.register(r"conversations", ConversationViewSet, basename="conversation")
router.register(r"messages", MessageViewSet, basename="message")
router.register(r"models", AIModelViewSet, basename="aimodel")

urlpatterns = [
    path("", include(router.urls)),
    path("ai/", AIChatAPIView.as_view(), name="ai-chat"),
    path("stats/", ChatStatsAPIView.as_view(), name="chat-stats"),
]
