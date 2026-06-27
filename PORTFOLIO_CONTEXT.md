# PORTFOLIO_CONTEXT.md
> Raw material for a client-facing portfolio case study on Lantara v2.
> Factual and codebase-verified. Written for a designer/developer portfolio audience.

---

## 1. One-Line Summary

A government permit portal for Indonesia's new capital city (IKN Nusantara) — built as a dynamic engine so new permit types can be added as configuration, not code.

---

## 2. The Problem

IKN (Ibu Kota Nusantara) is Indonesia's purpose-built new capital, still under construction. Its public services agency — Otorita IKN — needs to issue regulated permits across 31 sectors (social services, health, education, environment, etc.). The legacy approach at most government agencies means each permit type has its own hardcoded workflow, form, and codebase. That breaks every time a new regulation appears or a workflow changes — which in a new city is constant.

**Who it's for:** Three audiences simultaneously:
- **Citizens/businesses** applying for permits (applicants)
- **Government staff** reviewing and approving those applications (verifiers)
- **Agency administrators** who define the rules: which documents to require, how many review stages, how long each stage can take

The core pain point: permit rules are set by regulation (law, ministerial decree), not by developers. Non-technical administrators need to define and change workflows without touching code or waiting for a deployment.

---

## 3. My Role

Built the entire system from scratch — backend architecture, frontend, design system, Docker orchestration, CI pipeline, and fixture data — across all four build phases (P0 scaffold through P4 hardening). The PRD and CLAUDE.md were the brief; everything in the `backend/` and `frontend/` directories, plus `docker-compose.yml`, `nginx/`, `.github/`, and `fixtures/`, was built during this engagement.

---

## 4. Technical Approach

**The engine design (most important decision):** Instead of one database table per permit type, all permit configuration lives in five related tables: `Sektor`, `PermitType`, `WorkflowStage`, `FormField`, and `DocumentRequirement`. A new permit type is a data-entry operation. An admin can add a 6-stage health permit with 12 required documents and a custom form — no migration, no deploy, no developer involved.

The form data on each submission is a JSON field, validated at runtime against the live field schema. When an admin edits a permit's schema, in-flight submissions are protected: on submission, the current schema version is snapshot-copied onto the record. So a citizen who already applied doesn't have their form shape change mid-review.

**RBAC without an enum:** Staff permissions are strings like `verifikasi_teknis:izin_posyandu`, generated from workflow stage keys and permit type keys. There's no `if role == "verifier"` anywhere. The DRF permission class checks the submission's current stage against the user's assigned role strings. New izin types automatically have the right role slots without any code change.

**SLA as a first-class concern:** Every workflow stage has an `sla_hours` field; every permit type has an `sla_days` total. A Celery Beat task sweeps submissions periodically, recomputes SLA deadlines using a working-days calendar (government holidays + weekends from a reference table), and fires notifications when submissions are at-risk or breached. Verifier queue cards visually age from amber to red as deadlines approach.

**Two-register design system:** Public surfaces (landing, catalog, permit validation) use an immersive royal-blue + gold palette with animated hero, scroll-reveal, and glassmorphism — appropriate for the digital front door of a national capital. Authenticated surfaces (applicant portal, verifier workspace, admin) are calm and dense. A verifier processing 50 permits a day needs information clarity, not decoration. The design system enforces this split.

---

## 5. Actual Tech Stack

Verified from `package.json`, `pyproject.toml`, and `docker-compose.yml`:

**Backend**
- Python 3.12, Django 5, Django REST Framework
- PostgreSQL 16
- Redis 7 (Celery broker + result backend + cache)
- Celery + Celery Beat (async jobs, SLA sweep)
- Django Channels + Daphne (WebSocket, real-time notifications)
- MinIO via django-storages (S3-compatible object storage)
- djangorestframework-simplejwt (JWT auth, access + refresh rotation)
- WeasyPrint (HTML → PDF server-side permit generation)
- openpyxl (Excel export)
- ruff + black (linting/formatting, enforced in CI)
- pytest + pytest-django (test suite)

**Frontend**
- React 18.3, TypeScript 5.5, Vite 5.3
- React Router 6.24
- TanStack Query v5 (server state)
- Zustand 4.5 (UI-only state)
- react-hook-form 7.52 + zod 3.23 (dynamic schema-driven forms)
- Framer Motion 11.3 (animation)
- Recharts 2.12 (analytics charts)
- MapLibre GL 4.5 (spatial/RDTR zone map)
- Radix UI primitives (Dialog, Select, Toast, Tabs, Checkbox, etc.) via shadcn/ui
- Tailwind CSS 3.4, class-variance-authority, tailwind-merge
- lucide-react (icons), axios 1.7, date-fns 3.6

**Infrastructure**
- Docker + single `docker-compose.yml` (8 services)
- nginx (reverse proxy: SPA static + `/api` + `/ws` routing)
- GitHub Actions (ruff + black + tsc + eslint + build on push)

---

## 6. Notable Features

- **Dynamic permit engine:** Add a new permit type — with its own multi-stage workflow, custom form fields, and document requirements — entirely through the admin UI. No code changes, no database migrations, no deployment.

- **Schema-immutable submissions:** When a citizen submits an application, the full permit configuration is snapshot-frozen onto that submission record. Administrators can change live permit rules without affecting applications already in progress.

- **SLA-aware verifier queue:** Each submission card shows a live countdown to its SLA deadline, color-coded from amber (approaching) to red (breached). Keyboard shortcuts (`j`/`k` to navigate, `a`/`r`/`d` for approve/revise/reject) let staff process without touching the mouse.

- **Dynamic form renderer:** A single `<DynamicForm>` React component fetches the permit's `FormField[]` schema from the API and builds zod validation at runtime. It supports 12 field types (text, NIK, NPWP, phone, geo, file, select, etc.). Adding a new permit type requires zero frontend code.

- **Partial revision workflow:** When a verifier requests revisions, they select specific fields or documents. The applicant only re-uploads what was flagged. Unchanged files are retained. The audit trail records each revision cycle.

- **Public permit validation:** Every issued permit has a QR code. Anyone can scan it at `/validate` to confirm the permit is authentic, see the holder's name, permit type, and validity date — no login required.

---

## 7. Challenges and Tradeoffs

**The form data model decision:** The alternative to a `JSONField` for `Submission.form_data` is a typed relational structure (one row per field answer). That would allow SQL queries on individual field values but makes the schema completely rigid — adding a new field to a permit type would require a migration. The JSON approach was chosen deliberately and accepted as a constraint: field-level queries go through the `SubmissionIndex` denormalized table or the JSON field operators in PostgreSQL.

**Immutable schema snapshots vs. storage:** Copying the entire permit schema onto each submission duplicates data. Tradeoff accepted because the alternative — always reading the live schema — means a configuration change would silently alter the meaning of in-flight applications. The snapshot approach makes auditing deterministic: you always know exactly what a citizen was asked when they applied.

**RDTR and TTE deferred behind feature flags:** The spatial zoning feature (RDTR) depends on a data-sharing agreement with a spatial data provider. The embedded digital signature (TTE/BSrE) requires a formal API coordination with a government agency (BSSN). Both features are fully wired in the codebase behind `FEATURE_RDTR_REAL_SPATIAL` and `FEATURE_TTE_ENABLED` environment flags — the architecture and mock data are in place, but production activation is gated on external partnerships.

**Design pivot evidence (git log):** The landing page went through at least 6 focused iteration passes between 2026-06-13 and 2026-06-14 — commits like `fix(landing): hero CTA simplification + white strip elimination`, `feat(landing): alternating section rhythm, wave transitions, hero card preview`, and `fix(landing): correct HowItWorks→Features wave path direction`. The catalog and permit detail pages similarly had 3–4 dedicated refinement passes. This reflects an iterative visual tuning process rather than a spec-and-ship approach.

**Performance vs. realtime:** PDF generation, document virus scanning, and Excel exports all run as Celery async jobs (they return a task ID immediately). The WebSocket channel (Django Channels / Daphne) pushes job completion and submission status changes to connected clients. This means no long-polling or refresh-to-update — but it requires Redis, Daphne alongside gunicorn, and correct nginx WebSocket proxying. Worth the complexity for a permit system where status updates matter to citizens in real time.

---

## 8. Status

- **Development stage:** All four build phases (P0–P4) are complete as of 2026-06-18. The system is at the hardening/polish phase.
- **Deployment:** Not yet in production. Runs fully via `docker compose up` locally. Target deployment is Otorita IKN's infrastructure; production URL TBD.
- **Repository:** Private (https://github.com/thdoikn/lantara-v2). Not publicly accessible.
- **Demo-able:** Yes — `docker compose up` from a fresh clone runs migrations, loads KBLI master data, seeds 46 sample permits across 3 sectors, and creates a superadmin. App is accessible at `http://localhost`.

---

## 9. Metrics

| Metric | Value |
|---|---|
| Total commits | 95 |
| Development span | 2026-06-11 → 2026-06-18 (8 days) |
| Python files | 133 (excl. `__pycache__`, migrations) |
| Backend LOC | ~6,200 |
| TypeScript/TSX files | 40 |
| Frontend LOC | ~8,200 |
| Test files | 13 (869 LOC) |
| Django apps | 11 |
| Django models | ~20 across all apps |
| API endpoint groups | 12 (auth, sektors, permit-types, submissions, documents, permits, notifications, reference, admin/engine, analytics, rdtr, tte) |
| React feature modules | 6 (public, auth, applicant, verifier, admin, rdtr) |
| Sektor fixtures loaded | 3 sectors seeded (Sosial: 6 izin, Kesehatan: 31, Pendidikan: 9) |
| Permit types (sample) | 46 across 3 sectors |
| KBLI master records | ~2,200 KBLI codes across 27 bidang |
| Docker services | 8 (postgres, redis, minio, backend, worker, beat, frontend, nginx) |
| CI checks | 4 (ruff, black, tsc, eslint + build) |

---

## 10. Suggested Screenshots

**1. Landing page hero — `frontend/src/features/public/LandingPage.tsx`**
The dark royal-blue hero with animated drifting glow orbs, the IKN logo, headline, CTA buttons, and sektor preview cards below. Best captures the "digital front door of a national capital" aesthetic. Follow with a scroll to the wave-transitioned "Cara Mengajukan" section.

**2. Verifier queue — `frontend/src/features/verifier/VerifierQueue.tsx`**
The SLA-aware submission card grid: shows color-aging (amber/orange/red) badges based on deadline proximity, per-card metadata (applicant name, permit type, sektor, stage), and the keyboard shortcut bar. Best demonstrates the density-optimized staff UI contrast with the public landing.

**3. New submission — dynamic form — `frontend/src/features/applicant/DynamicForm.tsx` + `NewSubmissionPage.tsx`**
The 5-step submission wizard at step 2 (form fill), showing the schema-driven form with mixed field types (text, select, file, NIK). Ideally on a permit with 8+ fields. This is the technical core made visible.

**4. Admin engine builder — `frontend/src/features/admin/EngineBuilderPage.tsx`**
The drag-to-order workflow stage builder with the live citizen-form preview side-by-side. This is the strongest argument for the dynamic engine architecture — it shows non-technical configuration of a multi-stage government permit without touching code.

---

*Generated 2026-06-21. Verified against git log, package.json, pyproject.toml, and source tree.*
