from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InnovationProjectViewSet,
    InnovationChallengeViewSet,
    InnovationResourceViewSet,
    community_stats,
    join_community,
)

router = DefaultRouter()
router.register(r"projects", InnovationProjectViewSet)
router.register(r"challenges", InnovationChallengeViewSet)
router.register(r"resources", InnovationResourceViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("community/", community_stats, name="community-stats"),
    path("community/join/", join_community, name="join-community"),
]
