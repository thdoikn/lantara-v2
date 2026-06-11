# PRD — Lantara v2 (Layanan Nusantara)
> **Product Requirements Document — Version 2**
> Owner: Direktorat Data dan Kecerdasan Buatan (THD) — Otorita IKN
> Stakeholder (business process): Direktorat P5 / Deputi Pengendalian Pembangunan
> Status: Build-ready spec for autonomous implementation
> Last updated: 2026-06-11

> **How to use this file:** This PRD is the *what* and *why*. `CLAUDE.md` is the *how* (stack, conventions, build order, design system). Build strictly in the phase order defined in §13. Do not hardcode permit types — v2 is a **dynamic permit engine**. Read §3 before writing a single model.

---

## 1. Vision & Context

**Lantara** is the single permit-services portal for **Ibu Kota Nusantara (IKN)**. v1 was a Laravel monolith with **5 hardcoded permit types**, each with its own table and a fixed number of workflow stages baked into code. That model cannot scale.

Per the business-process meeting of 10 June 2026, Lantara v2 must:
- Accommodate **31 regulated sektor** (the master KBLI mapping spans **27 bidang / ~2,200 KBLI rows** — see §4).
- Be **"berbasis kustomisasi dinamis"** — a permit type, its workflow stages, its form fields, and its document requirements must all be **configuration/data, not code**. The tim teknis explicitly asked for this engine.
- Separate **Berusaha vs Non-Berusaha** services, and accommodate izin that OSS does *not* cover (e.g. UPLS / izin panel surya mandiri < 500 KW for non-business operational buildings).
- Provide a clean **REST API + SPA** so a future mobile app and inter-system integration (OSS, Amdalnet, Simbrega, Investmar) are possible without a rebuild.

**v2 is also a flagship.** It is the public face of IKN's digital government. The public-facing surfaces must be immersive and award-grade; the staff/verifier surfaces must be fast, dense, and accessible (see CLAUDE.md design system).

**Primary success metrics**
- A new sektor/izin can be onboarded by an admin **without a code deploy**.
- Citizen can submit any seeded izin end-to-end; staff can process it through its configured stages; a signed PDF + QR is issued.
- Lighthouse ≥ 95 (perf/a11y/best-practices) on public pages; WCAG 2.1 AA on all authenticated pages.
- Every stage has an **SLA clock** (v1 had none) surfaced to both applicant and staff.

---

## 2. User Roles

| Role | Scope |
|---|---|
| **Superadmin** | Platform + engine config. Builds sektor/izin/stages/forms/requirements. Manages users, roles, RBAC, content. |
| **Sector Admin (Pengampu Sektor)** | Manages izin and verifier assignments *within their own sektor* only (e.g. Dit. Yandas for Pendidikan/Kesehatan; Dit. P5 for Sosial). |
| **Verifikator / Staff** | Processes submissions only at the **stages + izin** their role permits. Approve / revise / reject / generate draft / sign / record collection. |
| **Pejabat Penanda Tangan (TTE)** | Director/Deputy who signs the issued permit (Phase 3 embedded TTE; Phase 1–2 = signature template). |
| **Applicant (Pemohon)** | Citizen / business rep / institution. Submits, tracks, responds to revisions, collects. |
| **Petugas Pengaduan (Helpdesk)** | Handles complaints/visits via WhatsApp "Satu Nomor" + colored-ticket module. |
| **Public (unauthenticated)** | Browse services, validate a permit by QR, submit contact/complaint. |

> RBAC is **stage-scoped**: a verifier permission is `{stage_key}:{izin_key}` resolved dynamically from engine config, NOT a static enum. See §5.6.

---

## 3. THE PERMIT ENGINE (core of v2 — read first)

Everything else hangs off this. A permit type is **not a Django model per type**. It is a row in `PermitType` plus child config rows. v1's `permit_health_worker_practices`, `permit_official_visits`, etc. are **deleted as concepts** — their data lives in a generic submission + JSON form-data structure.

### 3.1 Engine entities

```
Sektor (31 regulated + "Lainnya" escape hatch)
  └── PermitType (izin)              e.g. "Pendaftaran LKS Berbadan Hukum"
        ├── is_berusaha (bool)        Berusaha vs Non-Berusaha
        ├── oss_covered (bool)        if true → route/deeplink to OSS, don't reimplement
        ├── sla_days (int)            from "Jangka Waktu Pelayanan" (e.g. 8, 5, 3)
        ├── legal_basis (text[])      "Dasar Hukum" list
        ├── product_name (str)        "Produk Pelayanan"
        ├── WorkflowStage[]  (ordered, configurable count — NOT fixed 4/5/6/24)
        │     ├── key, order, name, type(verification|payment|external|publish|collection)
        │     ├── actor_role / verifier assignment
        │     ├── sla_hours (per-stage SLA)
        │     └── allowed_actions (approve|revise|reject|sign|generate|external_handshake)
        ├── FormField[]      (the dynamic form schema — replaces per-type tables)
        │     ├── key, label, field_type(text|number|date|select|file|nik|npwp|geo|map_point)
        │     ├── required, validation_json, options_json, order, section
        │     └── prefill_from_profile (bool)
        └── DocumentRequirement[]   (from "Persyaratan")
              ├── key, title, description, allowed_types[], max_bytes, required
              └── conditional_on (optional — show only if a FormField == value)
```

### 3.2 Why JSON form-data, not per-type tables
- v1 had 5 tables → 31 sektor would mean dozens of tables and a migration per izin. Unmaintainable.
- v2: `Submission.form_data` is a **JSONField** validated at runtime against the izin's `FormField[]` schema. New izin = new config rows, **zero migrations, zero deploy**.
- Trade-off accepted: heavy cross-izin reporting uses a thin `SubmissionIndex` table (denormalized key fields: applicant, sektor, izin, status, sla_due, created) for fast list/filter/export. Engine stays flexible; lists stay fast.

### 3.3 Admin Engine-Builder UI (Superadmin / Sector Admin)
A no-code builder so P5/sector admins onboard izin themselves:
- Create/edit Sektor → izin → drag-to-order **stages**, assign verifier role + SLA per stage.
- **Form builder**: add fields, pick type, set validation, mark prefill-from-profile, group into sections.
- **Requirement builder**: add document requirements, allowed types, size, required, conditional logic.
- **Preview**: render the citizen-facing form live before publishing.
- **Versioning**: editing a live izin creates a new version; in-flight submissions keep their original schema version (immutable snapshot stored on the submission).

### 3.4 The "Lainnya" escape hatch
Per the meeting: a dedicated path for dynamic perizinan outside the 31 standard sektor (e.g. draft Pendatsus / daerah mitra policies). This is just a Sektor flagged `is_catchall=true` whose izin can be spun up fast with the builder. No special code path.

---

## 4. Seed Data (ships with v2)

### 4.1 KBLI master mapping → `kbli_loader`
Source: `SEKTOR_-_BERDASARKAN_KBLI_2020.csv`. A management command parses it into reference tables. CSV layout (header on row 8, sektor headers like `A. PENDIDIKAN` break the body):

| CSV column | Field |
|---|---|
| BIDANG (PP 27/2023) | `Bidang.name` |
| SEKTOR (OSS) | `Sektor.oss_name` |
| KBLI 5 DIGIT | `KbliCode.code` (forward-fill within group) |
| JUDUL | `KbliCode.title` |
| VERIFIKATOR TEKNIS SEKTOR | `KbliCode.verifier_sector` |
| LANTARA | `KbliCode.lantara_izin_label` (links to a PermitType when one exists) |
| PENGAMPU SEKTOR | `KbliCode.pengampu` (default Sector Admin) |
| KETERANGAN | `KbliCode.notes` (e.g. "PMA → KL Pusat", "diajukan ke Kemenag via link…") |

Seeded counts to validate the loader (rows with a KBLI/judul): Pendidikan 92, Kesehatan 43, PUPR 78, Perhubungan 120, Penanaman Modal 117, Perdagangan 330, Perindustrian 459, Pertanian 135, etc. — 27 bidang total.

This table powers (a) auto-suggesting the verifier/pengampu when an admin creates an izin, and (b) the RDTR feature (§9).

### 4.2 Three mature sektor → full izin config
The meeting confirmed only **3 of 31 sektor** have FGD-ready Standar Pelayanan. Seed all three as working izin via fixtures:
- **Sektor Sosial — 6 izin** (full spec available in `STANDAR_PELAYANAN…SOSIAL.docx`; use it verbatim as the reference fixture):
  1. Pendaftaran LKS Berbadan Hukum — SLA 8 hari
  2. Pendaftaran LKS Tidak Berbadan Hukum — SLA 8 hari
  3. Tanda Daftar Yayasan — SLA 5 hari
  4. Izin Pendirian Panti Sosial — SLA 8 hari
  5. Izin Pendirian Non Panti Sosial — SLA 8 hari
  6. Izin Penyelenggaraan Pengumpulan Uang atau Barang (PUB) — SLA 3 hari
- **Sektor Kesehatan — 31 izin** (config skeletons; carry over v1's Surat Izin Praktik Tenaga Kesehatan as a fully-fleshed example).
- **Sektor Pendidikan — 9 izin** (config skeletons, verifier = Dit. Yandas from CSV).

> Each Sosial izin's DOCX maps cleanly to engine config: **Persyaratan → DocumentRequirement[]**, **Sistem/Mekanisme → WorkflowStage[]** (pemohon submit → tim teknis verifikasi + kunjungan lapangan → Kepala Otorita terbit izin → pemohon terima via WA/online), **Jangka Waktu → sla_days**, **Produk → product_name**, **Dasar Hukum → legal_basis**, **Pengaduan → standard complaint block**. Build the Sosial fixtures to exactly mirror the DOCX so it can be demoed to P5 as ground truth.

### 4.3 Standard "kunjungan lapangan" stage
Every Sosial izin includes a **field-visit (kunjungan lapangan)** step in tim-teknis verification. Model this as a stage `type=verification` with a `requires_site_visit` flag that unlocks a visit-scheduling sub-form (date, officers, findings, photos). Reused across sektor.

---

## 5. Core Modules

### 5.1 Auth & Accounts
Email/NIK + password, email **OTP** verification, password reset, multi-step profile (personal / professional / location), avatar, soft-delete, last-seen. JWT (access+refresh) for the SPA. Carry over v1's captured profile fields. Add: optional **WhatsApp number verification** (feeds §8).

### 5.2 Submission lifecycle (generic, engine-driven)
```
draft → submitted → [stage_1 … stage_N as configured] → publishing → document_collection → collected
                              ↘ revision (back to current stage)   ↘ rejected (terminal)
```
- Status is **derived from the izin's configured stages**, not a fixed enum. Store `current_stage_key` + a status label.
- On submit, snapshot the izin's schema version onto the submission (immutability — §3.3).
- **Partial re-submission**: revision marks only the flagged fields/docs as needing update; applicant does NOT re-upload unchanged documents (fixes v1 pain point #8).
- UUID + per-izin sequence + reference number (`LANTARA/{sektor}/{izin}/{YYYY}/{seq}`).

### 5.3 SLA & deadline tracking (new in v2)
- Per-stage `sla_hours` and per-izin `sla_days`. Compute `sla_due_at` per stage entry.
- Working-days calculation (Indonesian holidays + weekends excluded — config table).
- Dashboard surfaces: on-track / at-risk / breached, color-coded. Applicant sees an honest ETA.

### 5.4 Document requirements & upload
Dynamic per izin (§3.1). Per-requirement type/size validation. Conditional requirements. Object storage (MinIO/S3-compatible) with virus-scan hook + checksum. **Async** processing (Celery) — never block the request (fixes v1 pain #2).

### 5.5 Verification workspace (staff)
- Queue filtered by the verifier's permitted `{stage}:{izin}` set, with SLA color and aging.
- Actions: approve→next, request revision (field/doc-level notes), reject (reason), schedule/record site visit, **generate draft PDF**, sign (Phase 3 TTE), record collection.
- **Bulk actions** (fixes v1 #15): multi-approve, multi-assign.
- Side-by-side: form data + uploaded docs viewer + audit timeline.

### 5.6 RBAC (dynamic, stage-scoped)
- Roles are data; permissions are generated from engine config as `{stage_key}:{izin_key}` and `sektor_admin:{sektor_key}`.
- A role = a set of these. A user has ≥1 role (multi-role allowed, fixing v1 #5).
- Middleware/DRF permission classes resolve access against the submission's current stage + izin at request time.

### 5.7 Audit log
Every status/stage change, every actor, from→to, action, notes, `is_applicant_action`, timestamp, IP. Immutable, exportable. Surfaced as a visual **timeline** for applicants (fixes v1 #7 — the 24-stage land permit becomes a readable vertical stepper).

### 5.8 Auto-draft permit generation (Phase 2 — IN SCOPE)
Per the meeting's "fitur generate draft": staff trigger generates a **draft permit document** from a per-izin **template** (docx/HTML → PDF) with merge fields pulled from `form_data` + signatory block + terbilang (number-to-text) + embedded **QR**. Staff review/edit before publish. Replaces manual retyping. Async (Celery), uploaded to object storage on publish.

### 5.9 PDF + QR public validation
On publish, QR UUID embedded; public route `/validate/{uuid}` shows permit type, applicant/sender, dates, status, publish date — no login. Multi-signatory supported (fixes v1 #12).

### 5.10 Notifications
In-app notification center (bell + panel — fixes v1 #4) **and** email **and** WhatsApp (§8). Triggers: OTP, reset, stage advance, revision requested, permit published, SLA-at-risk (to staff). Real-time via WebSocket/SSE so applicants don't refresh (fixes v1 #1).

---

## 6. Public-Facing & Content
- **Immersive landing** (forest→city motion, see CLAUDE.md): hero, "cari layanan" intelligent search across all izin, sektor directory, FAQ (DB-driven, orderable), direct-permit shortcuts, contact/complaint form (rate-limited).
- **Service catalog**: browse 31 sektor → izin, each with persyaratan, SLA, biaya (Rp0 s/d 2035 per the Sosial SK), dasar hukum, and a "Ajukan" CTA. This is the citizen-first "grand design," not a digitized physical booth.
- **MPP Digital tenant directory**: Baznas, Bank BRI, Bank Kaltimtara, etc. surfaced as **tenant cards / FAQ links** — NOT deep-coded integrations (the meeting explicitly warned against scope creep; just route out).
- **Permit validation** page (§5.9).

---

## 7. Admin Features
Engine builder (§3.3), user/role/RBAC management, FAQ CRUD (drag-reorder), direct-permit CRUD, tenant directory CRUD, contact/complaint inbox with assignment + response workflow (fixes v1 #14), holiday calendar config, analytics dashboard (§10).

---

## 8. WhatsApp "Satu Nomor Layanan Publik IKN" + Visit Tickets (Phase 2 — IN SCOPE)
- One public number (takeover of P5's Mekari Contact license under THD) integrating: Perizinan (Lantara), Laporan Keluhan, Saran, Aspirasi Darurat. P5 retains helpdesk user access.
- **Colored visit-ticket module**: instansi/umum visit requests rendered as **color-coded digital tickets** (by status: pending=amber/Terakota, approved=green/Jagawana, rejected=red/Saka, scheduled=blue/Khatulistiwa) for fast approval monitoring.
- Integrate via the contact provider's API (Mekari Contact / WhatsApp Business API) behind an adapter interface — keep vendor swappable.

---

## 9. RDTR Interactive (Phase 3 — IN SCOPE, dependency-gated)
Benchmark: MPP Surabaya. Applicant inputs **koordinat** or uploads **SHP**; system locks the **zona** (e.g. tanaman pangan) and lists which **KBLI activities are permitted/forbidden** at that point, linking to the matching Lantara izin.
- Uses the KBLI master (§4.1) for activity↔izin mapping.
- **Hard dependencies (gates):** accurate spatial data from internal GIS / One Map, and ATR/BPN coordination. The meeting flagged this as complex and to be done **bertahap/paralel**. Build the UI + KBLI-lookup against a **mock spatial service** first; swap in real One Map data when available. Do not block Phase 1–2 on this.

---

## 10. Analytics & Reporting (new)
Admin dashboard with real metrics (fixes v1 #9): submissions by sektor/izin/status, SLA compliance %, avg processing time per stage, verifier workload (ties to your ABK interest — surface per-officer throughput), funnel/drop-off. **Export to Excel/CSV**. Charts on the dashboard; raw export for offline analysis.

---

## 11. Integrations (interfaces now, wiring later)
Define clean adapter interfaces; implement mocks in Phase 1 so nothing blocks:
- **OSS** — for `oss_covered` izin, deeplink/handshake rather than reimplement.
- **Amdalnet, Simbrega** — One-Stop-Service routing.
- **Investmar** — investor entry stays in Investmar; detailed permit processing handed to Lantara for clean audit trail.
- **BSSN/BSrE** — TTE certificate authority (Phase 3).
- **SP4N-LAPOR** — complaint channel link-out.

---

## 12. Non-Functional Requirements
- **Performance**: async everything heavy (PDF, uploads, scans) via Celery; list endpoints paginated + indexed; public pages Lighthouse ≥95.
- **Accessibility**: WCAG 2.1 AA on authenticated surfaces; keyboard-navigable verifier workspace.
- **Security**: HSTS, TLS, CSRF on session-y bits, JWT rotation, rate limiting, file-type/size enforcement, audit immutability, least-privilege RBAC. No secrets in repo.
- **i18n**: Bahasa Indonesia primary, English-ready (string catalog).
- **Observability**: structured logs, health endpoints, request tracing.
- **Data**: PostgreSQL; Redis (cache + Celery broker); MinIO (S3-compatible) for files.

---

## 13. Build Phases (Claude Code executes in this order)

**Phase 0 — Scaffold**
Monorepo (`backend/` Django + `frontend/` React) + one `docker-compose.yml` (Postgres, Redis, MinIO, backend, frontend, Celery worker+beat, nginx). Health checks green. CI lint.

**Phase 1 — Engine + Auth + Submit/Verify (MVP, fully buildable now)**
Engine models (§3), dynamic form renderer, dynamic doc upload, generic submission lifecycle, SLA clock, dynamic RBAC, audit timeline, JWT auth+OTP, applicant portal, verifier workspace, **seed: full Sektor Sosial (6 izin from DOCX)** + KBLI loader. In-app + email notifications. Public catalog + QR validation. **Demo-ready to P5 against the Sosial SK.**

**Phase 2 — Engine builder + Auto-draft PDF + WhatsApp/Tickets + Analytics**
No-code admin engine-builder UI, template→PDF draft generation, WhatsApp Satu Nomor adapter + colored visit-ticket module, analytics dashboard + Excel export, real-time WebSocket notifications. Seed Kesehatan (31) + Pendidikan (9) skeletons.

**Phase 3 — RDTR Interactive + Embedded TTE (dependency-gated)**
RDTR map UI + KBLI lookup against mock spatial service (swap to One Map later). Embedded TTE sirkular flow with BSSN/BSrE adapter — **build behind a feature flag; the manual/sirkular fallback per UKHK stays available** until the Perka Teknik legal basis is enacted.

**Phase 4 — Hardening**
A11y audit, Lighthouse, load test, security pass, inter-system adapters (OSS/Amdalnet/Simbrega/Investmar) wired as they become available.

---

## 14. Explicitly Out of Scope (v2)
- Deep-coded integration of tenant internal systems (Baznas etc.) — directory/FAQ only.
- Building OSS-covered berusaha izin that already live in OSS — route out, don't rebuild.
- Native mobile app (the REST API makes it possible later; not built here).
- Real One Map spatial ingestion and live TTE issuance — gated on external readiness (mocks built so the rest ships).

---

## 15. Carry-over from v1 (must-keep behaviors)
Email OTP, password reset, multi-step profile, per-requirement file validation, QR public validation, signature templates (until TTE), copy-letter recipients, terbilang in formal docs, contact form rate-limit, reference/sequence numbering. **Everything v1 did, v2 must still do — but through the engine, not hardcoded.**

---
*This PRD is the authoritative scope for Lantara v2. Pair with CLAUDE.md. Build in phase order. When in doubt, the dynamic engine (§3) and the Sektor Sosial DOCX fixture are ground truth.*
