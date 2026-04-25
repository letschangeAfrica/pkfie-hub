from __future__ import absolute_import, unicode_literals
import os
from celery import Celery

# Set default Django settings module for 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pkfehub_backend.settings")

app = Celery("pkfehub_backend")

# Read configuration from Django settings, using CELERY_ prefix for keys
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all registered apps (looks for tasks.py)
app.autodiscover_tasks()
