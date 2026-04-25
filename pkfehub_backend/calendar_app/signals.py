from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.apps import apps
from django.utils import timezone
from django.db import transaction
from .models import CalendarEvent
import logging

logger = logging.getLogger(__name__)


@receiver(post_save)
def sync_external_to_calendar(sender, instance, created, **kwargs):
    """
    Central receiver: when an Event or Announcement (from other apps) is created/updated,
    ensure a single CalendarEvent exists for that source (idempotent).
    """
    model_name = sender.__name__

    # Only handle models we care about here. Use transaction.on_commit to avoid races.
    if model_name == "Event" and hasattr(instance, "start_time"):
        transaction.on_commit(lambda: _sync_event_to_calendar(instance, created))
    elif model_name == "Announcement" and hasattr(instance, "start_date"):
        transaction.on_commit(lambda: _sync_announcement_to_calendar(instance, created))


def _sync_event_to_calendar(event_instance, created):
    """
    Idempotent sync for Event -> CalendarEvent.
    Uses update_or_create keyed on source + source_id.
    """
    try:
        defaults = {
            "title": event_instance.title,
            "description": event_instance.description or "",
            "event_type": event_instance.event_type or "institutional",
            "start_time": event_instance.start_time,
            "end_time": event_instance.end_time,
            "location": event_instance.location or "",
            "organizer": event_instance.organizer or "Institutional",
            "is_public": True,
            "is_active": getattr(event_instance, "is_active", True),
            "source": "events_app",
            "source_data": {
                "organizer_user_id": getattr(event_instance, "organizer_user_id", None),
                "max_attendees": getattr(event_instance, "max_attendees", None),
                "registration_link": getattr(event_instance, "registration_link", None),
            },
        }

        # Use update_or_create to guarantee idempotency
        obj, created_flag = CalendarEvent.objects.update_or_create(
            source="events_app", source_id=event_instance.id, defaults=defaults
        )

        if created_flag:
            logger.info(
                f"Created calendar event from Event(id={event_instance.id}): {event_instance.title}"
            )
        else:
            logger.info(
                f"Updated calendar event for Event(id={event_instance.id}): {event_instance.title}"
            )

    except Exception as e:
        logger.exception(
            f"Error syncing event to calendar (id={getattr(event_instance,'id', None)}): {e}"
        )


def _sync_announcement_to_calendar(announcement_instance, created):
    """
    Idempotent sync for Announcement -> CalendarEvent.
    The announcement has start_date/end_date; map to calendar event.
    """
    try:
        # Only create calendar events for active announcements
        if not getattr(announcement_instance, "is_active", True):
            # If previously synced, mark as inactive
            CalendarEvent.objects.filter(
                source="announcements_app", source_id=announcement_instance.id
            ).update(is_active=False)
            logger.info(
                f"Announcement(id={announcement_instance.id}) is not active — ensured calendar event inactive"
            )
            return

        start = getattr(announcement_instance, "start_date", None)
        end = getattr(announcement_instance, "end_date", None) or (
            start + timezone.timedelta(hours=1) if start else None
        )

        defaults = {
            "title": f"📢 {announcement_instance.title}",
            "description": announcement_instance.content or "",
            "event_type": "announcement",
            "start_time": start,
            "end_time": end,
            "organizer": getattr(
                announcement_instance.author, "get_full_name", lambda: None
            )()
            or getattr(announcement_instance.author, "email", ""),
            "is_public": True,
            "is_active": True,
            "source": "announcements_app",
            "source_data": {
                "author_id": getattr(announcement_instance, "author_id", None),
                "priority": getattr(announcement_instance, "priority", None),
            },
            "color": "#10B981",
        }

        obj, created_flag = CalendarEvent.objects.update_or_create(
            source="announcements_app",
            source_id=announcement_instance.id,
            defaults=defaults,
        )

        if created_flag:
            logger.info(
                f"Created calendar event for Announcement(id={announcement_instance.id}): {announcement_instance.title}"
            )
        else:
            logger.info(
                f"Updated calendar event for Announcement(id={announcement_instance.id}): {announcement_instance.title}"
            )

    except Exception as e:
        logger.exception(
            f"Error syncing announcement to calendar (id={getattr(announcement_instance,'id', None)}): {e}"
        )


@receiver(post_delete)
def delete_synced_calendar_event(sender, instance, **kwargs):
    """
    Remove calendar events that were created from other apps when the original is deleted.
    """
    try:
        model_name = sender.__name__
        if model_name == "Event":
            deleted = CalendarEvent.objects.filter(
                source="events_app", source_id=instance.id
            ).delete()
            logger.info(
                f"Deleted calendar events for Event(id={instance.id}), deleted={deleted}"
            )
        elif model_name == "Announcement":
            deleted = CalendarEvent.objects.filter(
                source="announcements_app", source_id=instance.id
            ).delete()
            logger.info(
                f"Deleted calendar events for Announcement(id={instance.id}), deleted={deleted}"
            )
    except Exception as e:
        logger.exception(
            f"Error deleting synced calendar events for {sender.__name__}(id={getattr(instance,'id',None)}): {e}"
        )
