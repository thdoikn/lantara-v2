#!/bin/bash
set -e

echo "Waiting for database..."
until python -c "import psycopg; psycopg.connect('${DATABASE_URL}')" 2>/dev/null; do
  sleep 1
done
echo "Database ready."

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Loading KBLI reference data..."
python manage.py load_kbli --skip-if-exists || true

echo "Loading fixtures..."
python manage.py load_fixtures --skip-if-exists || true

echo "Loading org structure (Kedeputian & Direktorat)..."
python manage.py loaddata apps/reference/fixtures/kedeputian_direktorat.json || true

echo "Bootstrapping superadmin..."
python manage.py bootstrap_superadmin || true

echo "Ensuring MinIO bucket exists..."
python manage.py ensure_minio_bucket || true

echo "Seeding RDTR mock zones..."
python manage.py seed_rdtr_mock || true

exec "$@"
