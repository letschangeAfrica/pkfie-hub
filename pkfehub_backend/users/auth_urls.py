from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.register_user, name="register"),
    path("login/", views.login_user, name="login"),
    path("token-refresh/", views.token_refresh_view, name="token-refresh"),
    path("logout/", views.logout_user, name="logout"),
    path("profile/", views.user_profile, name="user-profile"),
    path("change-password/", views.change_password, name="change-password"),
]
