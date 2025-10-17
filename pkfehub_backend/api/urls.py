from django.urls import path, include
from .views import CustomTokenObtainPairView, dashboard_data, registrations_per_month

urlpatterns = [
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("dashboard/", dashboard_data, name="dashboard_data"),
    path(
        "registrations-per-month/",
        registrations_per_month,
        name="registrations_per_month",
    ),
    path("", include("events.urls")),  # This line includes your event endpoints!
]
