from django.db.models.signals import post_save
from django.dispatch import receiver
from django.apps import apps
from django.contrib.auth import get_user_model
from django.db import transaction
from django.conf import settings
import logging

from .models import Notification

logger = logging.getLogger(__name__)
User = get_user_model()

# Try to import the async task; fall back if not available
try:
    from .tasks import create_bulk_notifications_task

    CELERY_AVAILABLE = True
except Exception:
    create_bulk_notifications_task = None
    CELERY_AVAILABLE = False


# Simple helper to chunk lists into batches (avoid very large bulk_create)
def _chunks(lst, n=500):
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


def _create_notifications_for_recipients_sync(
    recipients_pks, title, text, link=None, notif_type="info"
):
    objs = []
    for pk in recipients_pks:
        objs.append(
            Notification(
                user_id=pk,
                title=title,
                text=text,
                link=link or "",
                notif_type=notif_type,
            )
        )
    for batch in _chunks(objs, 500):
        Notification.objects.bulk_create(batch)


def _enqueue_notifications(recipients_pks, title, text, link=None, notif_type="info"):
    """
    Enqueue creation of notifications. Use Celery task if available, else do it inline.
    """
    if CELERY_AVAILABLE and create_bulk_notifications_task is not None:
        try:
            # fire-and-forget, pass plain python list
            create_bulk_notifications_task.delay(
                recipients_pks, title, text, link or "", notif_type or "info"
            )
            return
        except Exception as e:
            logger.exception(
                "Failed to enqueue create_bulk_notifications_task, falling back to sync creation: %s",
                e,
            )

    # fallback: synchronous (safe)
    _create_notifications_for_recipients_sync(
        recipients_pks, title, text, link=link, notif_type=notif_type
    )
