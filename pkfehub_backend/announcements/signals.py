from django.db.models.signals import post_save
from django.dispatch import receiver
from django.apps import apps
from django.contrib.auth import get_user_model
from django.db import models, transaction
import logging

from .models import Announcement
from notifications.models import Notification

logger = logging.getLogger(__name__)
User = get_user_model()


def _chunks(iterable, size=500):
    it = iter(iterable)
    while True:
        batch = []
        try:
            for _ in range(size):
                batch.append(next(it))
        except StopIteration:
            if batch:
                yield batch
            break
        yield batch


def _create_notifications_for_user_pks(
    user_pks, title, text, link=None, notif_type="info"
):
    """
    Bulk-create Notification rows for a list of user PKs, but avoid duplicates.
    Duplicate detection: for each user in a batch, skip creation if there's already
    a Notification with the same link (preferred) OR the same title.
    """
    if not user_pks:
        return

    batch_size = 500

    for batch_user_ids in _chunks(iter(user_pks), batch_size):
        # fetch existing notifications for this batch in a single query
        existing_qs = Notification.objects.filter(user_id__in=batch_user_ids)
        if link:
            existing_qs = existing_qs.filter(
                models.Q(link=link) | models.Q(title=title)
            )
        else:
            existing_qs = existing_qs.filter(title=title)

        existing_user_ids = set(existing_qs.values_list("user_id", flat=True))

        to_create = []
        for uid in batch_user_ids:
            if uid in existing_user_ids:
                # skip duplicate for this user
                continue
            to_create.append(
                Notification(
                    user_id=uid,
                    title=title,
                    text=text or "",
                    link=link or "",
                    notif_type=notif_type,
                    read=False,
                )
            )

        if to_create:
            Notification.objects.bulk_create(to_create)


@receiver(post_save, sender=Announcement)
def announcement_created_notify(sender, instance, created, **kwargs):
    """
    When a new Announcement is created, create notifications for active non-staff users.
    Avoid duplicates using _create_notifications_for_user_pks logic.
    """
    if not created:
        return

    # Only notify when the announcement is active (optional)
    if not getattr(instance, "is_active", True):
        return

    recipients_qs = User.objects.filter(is_active=True, is_staff=False).only("id")
    if not recipients_qs.exists():
        return

    title = f"New announcement: {instance.title}"
    preview = (
        (instance.content[:240] + "...")
        if instance.content and len(instance.content) > 240
        else (instance.content or "")
    )
    # Use a stable link that other code (or other signals) will also use — helps dedupe
    link = f"/announcements/{instance.pk}"

    user_pks = list(recipients_qs.values_list("id", flat=True))

    # Ensure notifications are created only after the Announcement transaction commits
    def _on_commit():
        try:
            _create_notifications_for_user_pks(
                user_pks, title=title, text=preview, link=link, notif_type="info"
            )
        except Exception:
            logger.exception("Failed to bulk-create announcement notifications")

    transaction.on_commit(_on_commit)


@receiver(post_save)
def event_created_notify(sender, instance, created, **kwargs):
    """
    When an Event is created, notify users.
    Uses lazy model lookup to avoid import cycles.
    """
    try:
        Event = apps.get_model("events", "Event")
    except LookupError:
        return

    if sender is not Event:
        return
    if not created:
        return

    recipients_qs = User.objects.filter(is_active=True, is_staff=False).only("id")
    if not recipients_qs.exists():
        return

    title = f"New event: {getattr(instance, 'title', 'Event')}"
    desc = getattr(instance, "description", "") or ""
    preview = (desc[:240] + "...") if desc and len(desc) > 240 else desc
    link = f"/events/{instance.pk}"

    user_pks = list(recipients_qs.values_list("id", flat=True))

    def _on_commit():
        try:
            _create_notifications_for_user_pks(
                user_pks, title=title, text=preview, link=link, notif_type="info"
            )
        except Exception:
            logger.exception("Failed to bulk-create event notifications")

    transaction.on_commit(_on_commit)
