from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/", include("users.urls")),
    path("api/feedback/", include("feedback.urls")),
    path("api/handbook/", include("handbook.urls")),
    path("api/innovation/", include("innovation.urls")),
    path("api/pathfinder/", include("pathfinder.urls")),
    path("api/", include("api.urls")),
    path("api/users/", include("users.urls")),
    path("api/", include("documents.urls")),
    path("api/", include("announcements.urls")),  # Announcements app
    # Make chat endpoints available at /api/ (in addition to /api/chat/)
    # This exposes /api/models/ (and other chat router endpoints) so your frontend's
    # GET /api/models/ will resolve correctly.
    path("api/", include("chat.urls")),
    # Keep the existing chat mount as well (still available at /api/chat/)
    path("api/chat/", include("chat.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/gallery/", include("gallery.urls")),
    path("api/", include("system.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/calendar/", include("calendar_app.urls")),
]

# Serve media files in development and production if DEBUG is True
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
