from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CalendarEventViewSet,
    EventReminderViewSet,
    CalendarSubscriptionViewSet,
)

router = DefaultRouter()
router.register(r"events", CalendarEventViewSet, basename="calendarevent")
router.register(r"reminders", EventReminderViewSet, basename="eventreminder")
router.register(
    r"subscriptions", CalendarSubscriptionViewSet, basename="calendarsubscription"
)

urlpatterns = [
    path("", include(router.urls)),
]
