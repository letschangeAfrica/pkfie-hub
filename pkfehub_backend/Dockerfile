FROM python:3.10-slim

# Prevents Python from writing .pyc files and buffers stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies needed by some packages (e.g. chromadb, Pillow)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies before copying source (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project source
COPY . .

# Collect static files — uses a dummy key that is never used at runtime
ARG SECRET_KEY=collectstatic-build-time-dummy-key-not-used-at-runtime
ENV SECRET_KEY=$SECRET_KEY
RUN python manage.py collectstatic --noinput
ENV SECRET_KEY=""

EXPOSE 8000

# Run migrations, create superuser if it doesn't exist, then start gunicorn.
# createsuperuser --no-input reads DJANGO_SUPERUSER_EMAIL, DJANGO_SUPERUSER_PASSWORD,
# DJANGO_SUPERUSER_FIRST_NAME, DJANGO_SUPERUSER_LAST_NAME from env vars.
# The '|| true' prevents a crash when the account already exists on redeploy.
CMD ["sh", "-c", "python manage.py migrate && python manage.py createsuperuser --no-input || true && gunicorn pkfehub_backend.wsgi:application --bind 0.0.0.0:8000 --workers 2"]
