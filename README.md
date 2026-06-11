# Lantara v2 — Layanan Nusantara

Portal perizinan resmi Ibu Kota Nusantara (IKN). Dynamic permit engine that lets administrators add new permit types as configuration, with zero code deploys.

## Quick start

```bash
cp .env.example .env
# edit .env — set SECRET_KEY and passwords for prod; defaults work for dev

docker compose up --build
```

On first boot the entrypoint automatically:
1. Waits for PostgreSQL to be ready
2. Runs all Django migrations
3. Loads the KBLI master reference data (`manage.py load_kbli`)
4. Loads the three-sektor permit fixtures (Sosial, Kesehatan, Pendidikan)
5. Creates the superadmin account from `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`

The app is then available at **http://localhost** (or `APP_PORT` if changed).

| Service | URL |
|---------|-----|
| Public portal | http://localhost |
| Django admin | http://localhost/django-admin/ |
| API (health) | http://localhost/api/v1/health/ |
| MinIO console | http://localhost:9001 |

## Tech stack

See [CLAUDE.md](CLAUDE.md) for the full stack, conventions, and design system.

| Layer | Tech |
|-------|------|
| Backend | Django 5 + DRF + Channels (ASGI) |
| Async | Celery + Redis + Celery Beat |
| Database | PostgreSQL 16 |
| Storage | MinIO (S3-compatible) |
| Auth | JWT (simplejwt) + OTP |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui + Framer Motion |
| Proxy | nginx |

## Build phases

| Phase | Contents | Status |
|-------|----------|--------|
| P0 | Scaffold + compose green | ✅ Current |
| P1 | Engine models + auth + submit/verify + Sosial seed | 🔜 Next |
| P2 | Engine builder UI + PDF draft + WhatsApp + analytics | — |
| P3 | RDTR (mock spatial) + embedded TTE (flagged) | — |
| P4 | Hardening (a11y, Lighthouse, security) | — |

## Development (without Docker)

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
# Start PostgreSQL and Redis locally or use docker compose up db redis minio
cp ../.env.example ../.env  # edit DATABASE_URL, REDIS_URL for local addrs
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # proxies /api and /ws to :8000
```

## Quality gates

```bash
# Backend
cd backend && ruff check . && black --check . && pytest

# Frontend
cd frontend && npm run type-check && npm run lint && npm run build
```

## Structure

```
lantara-v2/
├── docker-compose.yml     # single compose for all 8 services
├── .env.example           # all config vars documented here
├── nginx/default.conf     # reverse proxy config
├── backend/               # Django project
│   ├── config/            # settings, urls, asgi, celery
│   └── apps/              # 13 Django apps
├── frontend/              # React + Vite + TS
│   └── src/
│       ├── features/      # co-located by feature
│       ├── lib/           # api client, query, auth
│       └── styles/        # Tailwind + Nusantara tokens
└── fixtures/
    ├── kbli/              # SEKTOR_KBLI_2020.csv master mapping
    ├── sektor_sosial/     # 6 izin (Phase 1 ground truth)
    ├── sektor_kesehatan/  # 31 skeletons (Phase 2)
    └── sektor_pendidikan/ # 9 skeletons (Phase 2)
```
