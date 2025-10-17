from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.register_user, name="register"),
    path("login/", views.login_user, name="login"),
    path("profile/", views.user_profile, name="user-profile"),
    path("change-password/", views.change_password, name="change-password"),
    path("", views.UserListCreateView.as_view(), name="user-list-create"),
    path(
        "<int:pk>/", views.UserRetrieveUpdateDestroyView.as_view(), name="user-detail"
    ),
]
