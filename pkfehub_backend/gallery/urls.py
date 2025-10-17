from rest_framework.routers import DefaultRouter
from .views import OccasionViewSet, MediaViewSet, LikeViewSet

router = DefaultRouter()
router.register(r"occasions", OccasionViewSet)
router.register(r"media", MediaViewSet)
router.register(r"likes", LikeViewSet)

urlpatterns = router.urls
