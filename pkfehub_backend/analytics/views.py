from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.utils import timezone
from .models import AuditLog, UsageStatistics


@api_view(["GET"])
@permission_classes([IsAdminUser])
def dashboard_summary(request):
    today = timezone.now().date()
    stats = UsageStatistics.objects.filter(date=today).first()
    recent_logs = AuditLog.objects.order_by("-created_at")[:20]
    return Response(
        {
            "date": today,
            "total_users": stats.total_users if stats else 0,
            "active_users": stats.active_users if stats else 0,
            "total_messages": stats.total_messages if stats else 0,
            "recent_actions": [
                {
                    "action": log.action,
                    "resource": log.resource_type,
                    "user": log.user.email if log.user else "system",
                    "at": log.created_at,
                }
                for log in recent_logs
            ],
        }
    )
