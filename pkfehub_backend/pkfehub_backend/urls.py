from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Admin URL is configurable via DJANGO_ADMIN_URL env var to avoid easy scanning
    path(settings.ADMIN_URL, admin.site.urls),

    # Auth: login, register, token-refresh, logout, profile, change-password
    path("api/auth/", include("users.auth_urls")),

    # Admin user-management: list/retrieve/update/delete users
    path("api/users/", include("users.urls")),

    path("api/feedback/", include("feedback.urls")),
    path("api/handbook/", include("handbook.urls")),
    path("api/innovation/", include("innovation.urls")),
    path("api/pathfinder/", include("pathfinder.urls")),
    path("api/", include("api.urls")),
    path("api/", include("documents.urls")),
    path("api/", include("announcements.urls")),
    path("api/chat/", include("chat.urls")),  # single mount — no duplicate at /api/
    path("api/notifications/", include("notifications.urls")),
    path("api/gallery/", include("gallery.urls")),
    path("api/", include("system.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/calendar/", include("calendar_app.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
