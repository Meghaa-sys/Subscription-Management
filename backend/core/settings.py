"""Django settings for the Brightloop Subscription Management System."""
import os
import sys
from datetime import timedelta
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Must run before DATABASES. Real environment variables win over .env, which is
# what lets `DATABASE_URL=sqlite:///test.sqlite3 python manage.py test` work.
load_dotenv(BASE_DIR / ".env")


def env_bool(name, default=False):
    """Read a boolean environment variable."""
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


RUNNING_TESTS = sys.argv[1:2] == ["test"]

DEBUG = env_bool("DEBUG", False)

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if not (DEBUG or RUNNING_TESTS):
        raise ImproperlyConfigured("SECRET_KEY is not set. Add it to backend/.env.")
    SECRET_KEY = "django-insecure-local-development-only"

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # Brightloop
    "common",
    "accounts",
    "catalog",
    "subscriptions",
    "billing",
    "discounts",
    "reports",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# --- Database ---------------------------------------------------------------
if not os.environ.get("DATABASE_URL"):
    raise ImproperlyConfigured(
        "DATABASE_URL is not set. Add the Neon connection string to backend/.env "
        "(see .env.example)."
    )

# conn_health_checks: Neon suspends idle computes, which silently kills pooled
# connections; the check replaces a dead connection instead of failing a request.
# ssl_require only on PostgreSQL: SQLite, used for tests, rejects the sslmode option.
DATABASES = {
    "default": dj_database_url.config(
        conn_max_age=600,
        conn_health_checks=True,
        ssl_require=os.environ["DATABASE_URL"].startswith(("postgres://", "postgresql://")),
    )
}

# Test runs create and destroy a database, so they must never reach Neon.
if RUNNING_TESTS and DATABASES["default"]["ENGINE"] != "django.db.backends.sqlite3":
    raise ImproperlyConfigured(
        "Tests must run on SQLite. Use: "
        "DATABASE_URL=sqlite:///test.sqlite3 python manage.py test"
    )

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Auth --------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [{"NAME": "accounts.validators.StrongPasswordValidator"}]
PASSWORD_RESET_TOKEN_MINUTES = 30

# --- Locale ------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# --- CORS --------------------------------------------------------------------
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
CORS_ALLOWED_ORIGINS = [FRONTEND_URL]

# --- Email -------------------------------------------------------------------
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "Brightloop <no-reply@brightloop.test>")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
# In development, emails print to the console until an SMTP password is set.
if DEBUG and not EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.environ.get("EMAIL_HOST", "localhost")
    EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
    EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
    EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
    EMAIL_TIMEOUT = 10

# --- REST framework ----------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_PAGINATION_CLASS": "common.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "common.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_RATES": {"auth": "30/min"},
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "UPDATE_LAST_LOGIN": False,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Brightloop Subscription Management API",
    "DESCRIPTION": (
        "Backend for the Brightloop admin, staff and customer portals.\n\n"
        "**Conventions**\n"
        "- JSON only, snake_case fields, all routes under `/api/`.\n"
        "- Dates are `YYYY-MM-DD`, datetimes are ISO 8601.\n"
        "- **Money and other decimals are strings** such as `\"1499.50\"`. Never parse them "
        "as floats for calculations.\n"
        "- Lists return `{count, next, previous, results}`. Default page size 20; "
        "`?page_size=` goes up to 100.\n"
        "- Every error body has a string `detail`. Validation errors also carry the "
        "field errors next to it, for example "
        "`{\"detail\": \"This field is required.\", \"email\": [\"This field is required.\"]}`.\n"
        "- Status codes: 400 business rule or validation, 401 not logged in, 403 wrong role, "
        "404 not found or not yours.\n"
        "- Click **Authorize** and paste the `access` token from `/api/auth/login/`."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "ENUM_NAME_OVERRIDES": {
        "AmountTypeEnum": "common.enums.AmountType",
        "SubscriptionStatusEnum": "common.enums.SubscriptionStatus",
        "InvoiceStatusEnum": "common.enums.InvoiceStatus",
        "DiscountRequestStatusEnum": "common.enums.DiscountRequestStatus",
    },
    "SCHEMA_PATH_PREFIX": r"/api",
    "COMPONENT_SPLIT_REQUEST": True,
    "SWAGGER_UI_SETTINGS": {"persistAuthorization": True, "displayRequestDuration": True},
    "POSTPROCESSING_HOOKS": [
        "drf_spectacular.hooks.postprocess_schema_enums",
        "common.schema.add_error_responses",
    ],
}
