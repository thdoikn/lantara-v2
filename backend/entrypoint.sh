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

echo "Bootstrapping superadmin..."
python manage.py bootstrap_superadmin || true

exec "$@"
