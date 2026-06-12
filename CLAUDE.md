# CLAUDE.md — Lantara v2 Build Guide

> Operating manual for the Claude Code agent building **Lantara v2**.
> Read `PRD.md` first for *what* to build. This file is *how*: stack, repo layout, conventions, design system, and the rules you must not break.
> **Golden rule:** Lantara v2 is a **dynamic permit engine** (PRD §3). Never hardcode a permit type. A new izin must be addable as data, with zero migrations and zero deploy.

---

## 1. Tech Stack (fixed — do not substitute)

| Layer | Choice |
|---|---|
| Backend | **Django 5 + Django REST Framework** |
| Async | **Celery** + **Redis** (broker/result), Celery Beat for SLA sweeps |
| DB | **PostgreSQL 16** |
| Cache / realtime | **Redis** + **Django Channels** (WebSocket) for notifications |
| Object storage | **MinIO** (S3-compatible) via `django-storages` |
| Auth | **JWT** (`djangorestframework-simplejwt`), access+refresh, rotation |
| Frontend | **React 18 + Vite + TypeScript** |
| Routing/data | **React Router** + **TanStack Query** (server state) + **Zustand** (light UI state) |
| Styling | **Tailwind CSS** + **shadcn/ui** (Radix primitives) + **Framer Motion** |
| Forms | **react-hook-form** + **zod** (schema-driven, mirrors engine's dynamic forms) |
| Charts | **Recharts** |
| Maps (Phase 3) | **MapLibre GL** (RDTR) |
| PDF | **WeasyPrint** (HTML→PDF) server-side; **terbilang** lib for ID number-to-text |
| Tables/export | DRF + **openpyxl** for Excel export |
| Containerization | **Docker** + **one `docker-compose.yml`** at repo root |
| Reverse proxy | **nginx** (serves built frontend + proxies `/api`, `/ws`) |

---

## 2. Repository Layout (monorepo, ONE compose file)

```
lantara-v2/
├── docker-compose.yml          # SINGLE compose: db, redis, minio, backend, worker, beat, frontend, nginx
├── .env.example                # all config; never commit real .env
├── README.md
├── PRD.md
├── CLAUDE.md
├── nginx/
│   └── default.conf
├── backend/                    # Django project
│   ├── Dockerfile
│   ├── pyproject.toml          # or requirements.txt; use ruff + black
│   ├── manage.py
│   ├── config/                 # settings (base/dev/prod), urls, asgi, celery
│   └── apps/
│       ├── accounts/           # auth, profile, OTP, RBAC roles
│       ├── engine/             # ★ Sektor, PermitType, WorkflowStage, FormField, DocumentRequirement, versioning
│       ├── submissions/        # Submission, form_data JSON, lifecycle, SubmissionIndex, SLA
│       ├── verification/       # staff workspace, actions, site-visit, bulk
│       ├── documents/          # uploads, validation, virus-scan hook, storage
│       ├── permits/            # PDF/draft generation, QR, signatory, public validation
│       ├── notifications/      # in-app + email + WhatsApp adapter, Channels consumers
│       ├── whatsapp/           # Satu Nomor adapter (Mekari/WABA) + visit tickets  [Phase 2]
│       ├── analytics/          # metrics + Excel export                            [Phase 2]
│       ├── rdtr/               # KBLI lookup + spatial (mock→OneMap)               [Phase 3]
│       ├── tte/                # embedded signature, BSSN/BSrE adapter (flagged)   [Phase 3]
│       ├── reference/          # KBLI loader, geo, government institutions, holidays
│       └── common/             # base models, permissions, pagination, mixins
├── frontend/                   # React + Vite + TS
│   ├── Dockerfile
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── lib/                # api client, auth, query setup
│       ├── components/ui/      # shadcn primitives
│       ├── components/         # shared composed components
│       ├── features/
│       │   ├── public/         # immersive landing, catalog, validation
│       │   ├── auth/
│       │   ├── applicant/      # portal, dynamic form renderer, tracker timeline
│       │   ├── verifier/       # workspace, queues, actions
│       │   ├── admin/          # engine builder, RBAC, content, analytics
│       │   └── rdtr/           # [Phase 3]
│       ├── styles/             # tailwind config, tokens, globals
│       └── routes/
└── fixtures/
    ├── kbli/SEKTOR_KBLI_2020.csv       # the master mapping (PRD §4.1)
    ├── sektor_sosial/                  # 6 izin configs mirroring the DOCX (PRD §4.2)
    ├── sektor_kesehatan/               # 31 izin skeletons
    └── sektor_pendidikan/              # 9 izin skeletons
```

**Rules**
- ONE `docker-compose.yml`. `backend/` and `frontend/` each have their own Dockerfile but are orchestrated together.
- Backend serves **only** `/api` + `/ws` + `/media`. Frontend is built static, served by nginx, which proxies API/WS to backend. No Django templates for app UI (public SSR not required; SPA + good meta is fine).

---

## 3. The Engine — implementation rules (most important section)

1. **No per-permit-type model.** `Submission.form_data = JSONField`. Validate at runtime against the izin's `FormField[]` schema. Adding an izin = inserting `engine` rows, never a migration.
2. **Schema immutability.** On submit, copy the izin's current `schema_version` (full stage+field+requirement snapshot) onto the submission. In-flight submissions never change shape when an admin edits the live izin.
3. **Stages are data.** Workflow length varies (Sosial izin ≈ 4 stages; v1's land permit had 24). Never `if permit_type == ...`. Drive everything from `WorkflowStage` rows ordered by `order`.
4. **RBAC is generated, not enumerated.** Permissions are `{stage_key}:{izin_key}` and `sektor_admin:{sektor_key}`, resolved from engine config. DRF permission classes check the submission's *current* stage + izin against the user's roles.
5. **SLA is first-class.** Every stage has `sla_hours`; every izin `sla_days`. A Celery-beat sweep recomputes `sla_due_at`, flags at-risk/breached, and fires notifications. Use a working-days calendar (`reference.Holiday` + weekends).
6. **Partial revision.** Revisions target specific fields/docs; unchanged uploads are retained. Never force a full re-upload.
7. **The DOCX is ground truth for Sosial.** Each of the 6 izin fixtures must reproduce the Standar Pelayanan: Persyaratan→DocumentRequirement[], Sistem/Mekanisme→WorkflowStage[] (submit → tim teknis verifikasi **+ kunjungan lapangan** → Kepala Otorita terbit → pemohon terima via WA/online), Jangka Waktu→sla_days (8/8/5/8/8/3), Produk→product_name, Dasar Hukum→legal_basis. So P5 can verify it matches the SK exactly.
8. **KBLI loader** is a `manage.py load_kbli` command parsing the CSV (header row 8; forward-fill BIDANG/SEKTOR/KBLI down blank cells; sektor section headers like `A. PENDIDIKAN` start groups). Validate against counts in PRD §4.1.

---

## 4. Design System — "Nusantara Royal" (the award-winning layer)

**Design philosophy: two registers.**
- **Public surfaces (landing, catalog, validation): immersive.** Royal-blue depth, drifting glow orbs, glassmorphism, animated hero, scroll-reveal. This is the digital front door of the new capital — make it impress an international visitor and a first-time citizen equally.
- **Authenticated surfaces (applicant portal, verifier workspace, admin): calm, fast, dense, accessible.** A verifier processing 50 permits/day needs clarity, not glass. Restraint here is a feature, and juries reward it.

> Read the `frontend-design` skill before building UI. Then apply these tokens.

### 4.1 Color tokens (Royal palette)
Premium government identity: **royal-blue authority + gold accent**, off-white blue-tinted surfaces, navy ink. Tokens live in `frontend/tailwind.config.ts` (full `royal` 50–950 scale, `gold` 300–500, `ink`, `surface`, `status`). Legacy Nusantara token names (`jagawana`, `khatulistiwa`, `terakota`, `buana`, `pertiwi`, `saka`) are **remapped onto the royal system** in the config so they resolve to blue/gold — prefer the new names (`royal-*`, `gold-*`, `ink-*`, `surface`, `status-*`) in new code.

```css
:root{
  /* Brand — royal blue authority */
  --royal-600:#1E40AF;  /* primary brand — CTAs, links, active nav */
  --royal-700:#1A3480;  /* deep — gradients, button base */
  --royal-500:#2563EB;  /* info, focus rings, scheduled */
  --royal-900:#060D2E;  /* dark surfaces — hero, sidebars, footer */
  --royal-950:#03061A;  /* deepest dark surface */
  /* Accent */
  --gold-500:#D4A017;   /* warm accent — highlights, pending, premium flourish */
  /* Neutrals / surfaces */
  --surface:#F8FAFF;    /* off-white, blue-tinted page background */
  --ink:#0D1F5C;        /* primary text — navy */
  --ink-muted:#4B5E8A;  /* muted navy-grey */
  --ink-faint:#94A3B8;  /* faint placeholder/disabled */
  /* Status */
  --status-success:#059669;
  --status-warning:#D97706;
  --status-danger:#DC2626;  /* rejected / SLA-breached */
  --status-info:#2563EB;
}
```
**Ticket status colors (PRD §8):** pending→Gold/amber, approved→Emerald, rejected→Red, scheduled→Royal-500.

**Contrast rule:** body text = ink (`#0D1F5C`) on surface/white (passes AA comfortably). Never use ink-faint or gold for body copy on light surfaces. Run a contrast check; AA minimum on all authenticated UI.

### 4.2 Type & layout
- Display/headings: a strong geometric or humanist sans (e.g. *Plus Jakarta Sans* — Indonesian-made, fitting) for headings; *Inter* for body/UI. Generous line-height, real hierarchy.
- 8px spacing grid. Max content width ~1200px on dashboards, full-bleed allowed on landing.
- Rounded-2xl cards, soft shadows on public; flat/bordered density on dashboards.

### 4.3 Motion (Framer Motion + CSS)
- Landing hero: drifting blurred glow orbs (royal-700/gold) on a dark royal gradient — pure CSS keyframes (`drift-1/2/3`), GPU-light, not Framer. Scroll-reveal sektor cards via Framer. Respect `prefers-reduced-motion` — disable non-essential motion.
- Dashboards: micro-interactions only (state transitions, toasts). No decorative motion in data tables.

### 4.4 Signature UI moments (aim for "extraordinary")
- **Submission tracker** = a beautiful vertical stepper with live SLA countdown per stage and the audit timeline woven in (turns the dreaded 24-stage flow into something legible).
- **Engine builder** = drag-to-order stages with live citizen-form preview side-by-side.
- **Verifier queue** = SLA-aware, color-aging cards with keyboard shortcuts.
- **Public catalog** = "cari layanan" command-palette search across all 31 sektor.

### 4.5 Accessibility (non-negotiable)
WCAG 2.1 AA. Semantic HTML, focus-visible rings (royal-500), aria labels, keyboard nav across the whole verifier workspace, form errors announced, no color-only status (always icon+text alongside the color).

---

## 5. API Conventions
- REST under `/api/v1/`. Plural nouns. DRF ViewSets + routers.
- Pagination default 20, `?page=`. Filtering via `django-filter`. Ordering allowed on indexed fields.
- Auth: `Authorization: Bearer <access>`. Refresh endpoint rotates.
- Errors: consistent shape `{ "detail": str, "errors": {field: [msg]} }`.
- Engine endpoints expose izin schema so the **frontend renders forms dynamically from server config** (single source of truth — never duplicate field definitions in TS).
- Long jobs (PDF, export, scan) return a task id; poll or receive WS push. Never block.

---

## 6. Frontend Conventions
- TypeScript strict. No `any` in committed code.
- Server state → **TanStack Query** (never store server data in Zustand). UI-only state → Zustand.
- **Dynamic form renderer**: one `<DynamicForm schema={izinSchema}/>` consumes engine `FormField[]`, builds zod validation at runtime, maps `field_type`→component. Adding an izin needs **no frontend code**.
- shadcn/ui for primitives; compose, don't fork. Tailwind tokens from §4.1 only — no raw hex in components.
- Co-locate by feature (`src/features/*`). Shared bits in `components/` and `lib/`.

---

## 7. Docker / compose
- Services: `db` (postgres:16), `redis`, `minio`, `backend` (gunicorn+uvicorn worker / daphne for ASGI), `worker` (celery), `beat` (celery beat), `frontend` (build → nginx), `nginx`.
- Healthchecks on db/redis/minio; backend waits for them. `depends_on` with conditions.
- `docker compose up` from a fresh clone must: migrate, load KBLI + 3-sektor fixtures, create a superadmin (from env), and serve the app. Document this in README.
- All config via env (`.env.example` lists every var). No secrets committed.

---

## 8. Quality Gates (per phase, before moving on)
- Backend: `ruff` + `black` clean; pytest for engine logic (schema validation, stage transitions, RBAC resolution, SLA math) — these are the riskiest parts, test them hard.
- Frontend: `tsc --noEmit` clean, eslint clean, build succeeds.
- Each phase ends **demoable**: Phase 1 must let you submit and fully process a real Sektor Sosial izin end-to-end and validate the issued PDF by QR.
- A11y: axe clean on authenticated pages; Lighthouse ≥95 on public pages before Phase 4 sign-off.

---

## 9. Hard "do not" list
- ❌ Do not create a model/table per permit type. (PRD §3.2)
- ❌ Do not branch logic on permit-type name/id anywhere. Drive from config.
- ❌ Do not duplicate izin form-field definitions in the frontend — fetch from engine.
- ❌ Do not block requests on PDF/upload/scan — use Celery.
- ❌ Do not deep-integrate tenant systems (Baznas etc.) — directory/FAQ only. (PRD §6, §14)
- ❌ Do not reimplement OSS-covered berusaha izin — route out. (PRD §14)
- ❌ Do not ship RDTR against real spatial data or live TTE issuance — build mocks/flags; they're dependency-gated. (PRD §9, §13 Phase 3)
- ❌ Do not put glassmorphism/decorative motion in dense staff data tables. (§4)
- ❌ Do not commit secrets or real `.env`.

---

## 10. Build order (mirror PRD §13)
**P0** scaffold + compose green → **P1** engine + auth + submit/verify + Sosial seed + KBLI loader (demo to P5) → **P2** engine-builder UI + auto-draft PDF + WhatsApp/tickets + analytics + Kesehatan/Pendidikan seeds → **P3** RDTR (mock spatial) + embedded TTE (flagged) → **P4** hardening (a11y, Lighthouse, security, inter-system adapters).

Start at P0. Do not begin a phase until the previous one's quality gates (§8) pass.

---
*Pair with PRD.md. The engine (PRD §3 / CLAUDE §3) and the Sektor Sosial DOCX fixture are ground truth. When unsure, prefer configuration over code.*
