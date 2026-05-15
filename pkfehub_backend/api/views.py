import os
import calendar

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.conf import settings as django_settings
from django.utils import timezone
from django.utils.timesince import timesince
from django.db import connection
from django.db.models import Count
from django.db.models.functions import ExtractYear, ExtractMonth

from users.models import User
from documents.models import Document
from feedback.models import FeedbackSubmission
from chat.models import Conversation
from events.models import Event
from announcements.models import Announcement


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = {
            "email": self.user.email,
            "role": self.user.role,
        }
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


def check_database():
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return "online"
    except Exception:
        return "offline"


def check_api():
    # Since this endpoint is being hit, API is online
    return "online"


def check_ai_service():
    if os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY"):
        return "online"
    return "offline"


def check_storage():
    try:
        test_path = os.path.join(django_settings.MEDIA_ROOT, ".health_check")
        with open(test_path, "w") as f:
            f.write("ok")
        os.remove(test_path)
        return "online"
    except Exception:
        return "offline"


@api_view(["GET"])
@permission_classes([IsAdminUser])
def dashboard_data(request):
    stats = {
        "totalUsers": User.objects.count(),
        "activeUsers": User.objects.filter(is_active=True).count(),
        "totalDocuments": Document.objects.count(),
        "totalConversations": Conversation.objects.count(),
        "pendingFeedback": FeedbackSubmission.objects.filter(status="open").count(),
        "upcomingEvents": Event.objects.filter(
            start_time__date__gte=timezone.now().date(), is_active=True
        ).count(),
        "totalAnnouncements": Announcement.objects.filter(is_active=True).count(),
    }

    recent_activities = []

    # Recent user registrations
    for user in User.objects.order_by("-date_joined")[:3]:
        recent_activities.append(
            {
                "id": f"user_{user.id}",
                "user": str(user),
                "action": "registered as a new user",
                "time": timesince(user.date_joined) + " ago",
                "datetime": user.date_joined,
            }
        )

    # Recent document creations
    for doc in Document.objects.order_by("-created_at")[:3]:
        recent_activities.append(
            {
                "id": f"doc_{doc.id}",
                "user": str(doc.uploaded_by),
                "action": "uploaded a new document",
                "time": timesince(doc.created_at) + " ago",
                "datetime": doc.created_at,
            }
        )

    # Recent event creations
    for event in Event.objects.order_by("-created_at")[:2]:
        recent_activities.append(
            {
                "id": f"event_{event.id}",
                "user": event.organizer if event.organizer else "Unknown",
                "action": f"created event '{event.title}'",
                "time": timesince(event.created_at) + " ago",
                "datetime": event.created_at,
            }
        )

    # Recent feedback submissions
    for fb in FeedbackSubmission.objects.select_related("user").order_by("-created_at")[:2]:
        recent_activities.append(
            {
                "id": f"fb_{fb.id}",
                "user": str(fb.user),
                "action": f"submitted feedback: {fb.subject}",
                "time": timesince(fb.created_at) + " ago",
                "datetime": fb.created_at,
            }
        )

    # Sort by most recent
    recent_activities.sort(key=lambda x: x["datetime"], reverse=True)
    recent_activities = recent_activities[:6]
    for act in recent_activities:
        del act["datetime"]

    system_status = {
        "database": check_database(),
        "api": check_api(),
        "aiService": check_ai_service(),
        "storage": check_storage(),
    }
    return Response(
        {
            "stats": stats,
            "recentActivities": recent_activities,
            "systemStatus": system_status,
        }
    )


@api_view(["GET"])
@permission_classes([IsAdminUser])
def registrations_per_month(request):
    """
    Returns user registrations per month for the past 10 months.
    Response format:
    {
        "labels": ["Jan", "Feb", ...],
        "data": [12, 19, ...]
    }
    """
    today = timezone.now().date()
    months = []
    labels = []
    counts = []

    # Calculate the past 10 months (including current month)
    for i in range(9, -1, -1):
        month_date = today.replace(day=1) - timezone.timedelta(days=30 * i)
        months.append((month_date.year, month_date.month))
        labels.append(calendar.month_abbr[month_date.month])

    # Get user registrations grouped by year and month
    queryset = (
        User.objects.filter(
            date_joined__gte=timezone.now() - timezone.timedelta(days=300)
        )
        .annotate(year=ExtractYear("date_joined"), month=ExtractMonth("date_joined"))
        .values("year", "month")
        .annotate(count=Count("id"))
    )

    # Build a lookup dictionary {(year, month): count}
    month_count_map = {
        (entry["year"], entry["month"]): entry["count"] for entry in queryset
    }

    # Fill data for each month in order
    for year, month in months:
        counts.append(month_count_map.get((year, month), 0))

    return Response(
        {
            "labels": labels,
            "data": counts,
        }
    )
