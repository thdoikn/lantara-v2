#!/bin/bash
set -e

echo "Waiting for database..."
until python -c "import psycopg; psycopg.connect('${DATABASE_URL}')" 2>/dev/null; do
  sleep 1
done
echo "Database ready."

# Only ONE container may run migrations + seeding. Running them in backend,
# worker AND beat at once races on a fresh DB (duplicate-table errors, and the
# --skip-if-exists seeder splitting izin across processes). By default the web
# container owns release tasks; celery worker/beat skip them. Override with
# RUN_RELEASE_TASKS=1 (force on) or =0 (force off).
run_release="${RUN_RELEASE_TASKS:-}"
if [ -z "$run_release" ]; then
  case "$1" in
    celery) run_release=0 ;;
    *)      run_release=1 ;;
  esac
fi

if [ "$run_release" = "1" ] || [ "$run_release" = "true" ]; then
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
else
  echo "Skipping release tasks (migrations/seed) — owned by the web container."
fi

exec "$@"
