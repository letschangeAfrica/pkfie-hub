from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnnouncementViewSet, AnnouncementViewViewSet

router = DefaultRouter()
router.register(r"announcements", AnnouncementViewSet, basename="announcement")
router.register(
    r"announcement-views", AnnouncementViewViewSet, basename="announcementview"
)

urlpatterns = [
    path("", include(router.urls)),
]
