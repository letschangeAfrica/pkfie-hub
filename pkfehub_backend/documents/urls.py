from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DocumentCategoryViewSet,
    DocumentViewSet,
    DocumentChunkViewSet,
    DocumentViewViewSet,
)

router = DefaultRouter()
router.register(
    r"document-categories", DocumentCategoryViewSet, basename="document-category"
)
router.register(r"documents", DocumentViewSet, basename="document")
router.register(r"document-chunks", DocumentChunkViewSet, basename="document-chunk")
router.register(r"document-views", DocumentViewViewSet, basename="document-view")

urlpatterns = [
    path("", include(router.urls)),
]
