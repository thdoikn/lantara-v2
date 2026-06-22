FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System dependencies for WeasyPrint, psycopg, Pillow, python-magic
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    libffi-dev \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools wheel

# Install Python dependencies from pyproject.toml without installing the project itself.
# Copy only the dependency manifest first for better layer caching.
COPY pyproject.toml .
RUN pip install \
    "django>=5.0,<6.0" \
    "djangorestframework>=3.15" \
    "django-cors-headers>=4.3" \
    "django-filter>=24.2" \
    "django-environ>=0.11" \
    "psycopg[binary]>=3.1" \
    "djangorestframework-simplejwt>=5.3" \
    "mozilla-django-oidc>=4.0.0" \
    "pyotp>=2.9" \
    "celery[redis]>=5.3" \
    "django-celery-beat>=2.6" \
    "channels[daphne]>=4.1" \
    "channels-redis>=4.2" \
    "django-storages[s3]>=1.14" \
    "boto3>=1.34" \
    "weasyprint>=62" \
    "terbilang>=0.0.4" \
    "Pillow>=10.3" \
    "openpyxl>=3.1" \
    "qrcode[pil]>=7.4" \
    "python-magic>=0.4" \
    "bleach>=6.1" \
    "pytest>=8.1" \
    "pytest-django>=4.8" \
    "pytest-cov>=5.0" \
    "pytest-asyncio>=0.23" \
    "factory-boy>=3.3" \
    "ruff>=0.4" \
    "black>=24.4"

COPY . .

EXPOSE 8000

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
