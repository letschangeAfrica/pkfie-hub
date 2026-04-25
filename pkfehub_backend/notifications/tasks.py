from celery import shared_task
from .models import Notification


# Small helper to chunk lists
def _chunks(lst, n=500):
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


@shared_task(bind=True, name="notifications.create_bulk_notifications")
def create_bulk_notifications_task(
    self, recipients_pks, title, text, link="", notif_type="info"
):
    """
    Celery task that creates Notification rows in bulk for recipient user PKs.
    Expects recipients_pks as a list of ints and other strings.
    """
    objs = []
    for pk in recipients_pks:
        objs.append(
            Notification(
                user_id=pk,
                title=title or "",
                text=text or "",
                link=link or "",
                notif_type=notif_type or "info",
            )
        )
    created = 0
    for batch in _chunks(objs, 500):
        Notification.objects.bulk_create(batch)
        created += len(batch)
    return {"created": created}
