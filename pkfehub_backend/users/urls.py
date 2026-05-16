from django.urls import path
from . import views

# Admin user-management endpoints only.
# Auth endpoints (login, register, token-refresh, logout, profile) live in auth_urls.py
# and are mounted at /api/auth/ in the main urlconf.
urlpatterns = [
    path("", views.UserListCreateView.as_view(), name="user-list-create"),
    path("<int:pk>/", views.UserRetrieveUpdateDestroyView.as_view(), name="user-detail"),
]
