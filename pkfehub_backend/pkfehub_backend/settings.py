import os
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# ── SECRET_KEY ────────────────────────────────────────────────────────────────
# Must be set via environment variable in production.
# In development (DEBUG=True) an insecure fallback is used with a loud warning.
_secret_key = os.getenv("SECRET_KEY")
if not _secret_key:
    _debug_mode = os.getenv("DEBUG", "False").lower() == "true"
    if _debug_mode:
        import warnings
        warnings.warn(
            "SECRET_KEY is not set — using an insecure dev fallback. "
            "NEVER deploy without a real SECRET_KEY!",
            RuntimeWarning,
            stacklevel=1,
        )
        _secret_key = "insecure-dev-only-key-never-use-in-production-xkcd936"
    else:
        raise RuntimeError(
            "SECRET_KEY environment variable must be set. "
            "Set DEBUG=True to use an insecure fallback for local development only."
        )
SECRET_KEY = _secret_key

DEBUG = os.getenv("DEBUG", "False").lower() == "true"

ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# Admin URL — change this in production to something non-obvious
ADMIN_URL = os.getenv("DJANGO_ADMIN_URL", "admin/")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",  # needed for refresh token rotation
    "corsheaders",
    # Project apps
    "users",
    "documents",
    "chat",
    "pathfinder",
    "feedback",
    "announcements",
    "analytics",
    "handbook",
    "innovation",
    "events",
    "notifications",
    "gallery",
    "system",
    "calendar_app",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "pkfehub_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "pkfehub_backend.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

db_from_env = dj_database_url.config(conn_max_age=600)
DATABASES["default"].update(db_from_env)

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── CORS ──────────────────────────────────────────────────────────────────────
# Set CORS_ALLOWED_ORIGINS env var in production:
#   CORS_ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if o.strip()
]
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

# ── REST Framework ────────────────────────────────────────────────────────────
import sys
_TESTING = "test" in sys.argv

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    # Throttle classes are registered globally so per-view @throttle_classes scopes work.
    # During test runs all rates are set to unlimited so setUp login calls never hit 429.
    "DEFAULT_THROTTLE_CLASSES": [] if _TESTING else [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon":     "9999/second" if _TESTING else "60/minute",
        "user":     "9999/second" if _TESTING else "200/minute",
        "login":    "9999/second" if _TESTING else "5/minute",
        "register": "9999/second" if _TESTING else "10/minute",
    },
}

AUTH_USER_MODEL = "users.User"

# ── JWT ───────────────────────────────────────────────────────────────────────
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,      # each refresh call issues a new refresh token
    "BLACKLIST_AFTER_ROTATION": True,   # old refresh tokens are immediately invalidated
    "UPDATE_LAST_LOGIN": True,
}

# ── Email ─────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", 587))
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True").lower() == "true"
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "your_email@gmail.com")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "your_email_app_password")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER)

# ── Production security headers ───────────────────────────────────────────────
# These are safe to enable only when serving over HTTPS in production.
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31_536_000        # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    X_FRAME_OPTIONS = "DENY"
