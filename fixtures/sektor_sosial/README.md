# Sektor Sosial — 6 Izin (SK-complete)

Ground truth: **SK Standar Pelayanan Perizinan Sektor Sosial di Ibu Kota Nusantara** (Keputusan Kepala Otorita IKN, 2026). Each fixture reproduces the SK's Persyaratan → `doc_requirements`, Sistem/Mekanisme → `stages`, Jangka Waktu → `sla_days`, Produk → `product_name`, Dasar Hukum → `legal_basis`, and pengaduan channels → `complaint_info`.

Pengampu: Direktorat Pelayanan Dasar / Deputi Bidang Pengendalian Pembangunan.

## Workflow (two-bidang, 5 stages — per SK swimlane)
`submit → verifikasi-berkas (Bidang Perizinan) → verifikasi-data (Tim Teknis / Bidang Pelayanan Dasar, + kunjungan lapangan) → penerbitan (Kepala Otorita) → pengambilan`.

## Izin (SK Diktum KETIGA a–f)

| # | Key | Izin | SLA (hari kerja) |
|---|-----|------|------------------|
| a | `lks-berbadan-hukum` | Pendaftaran LKS Berbadan Hukum | 8 |
| b | `lks-tidak-berbadan-hukum` | Pendaftaran LKS Tidak Berbadan Hukum | 8 |
| c | `tanda-daftar-yayasan` | Tanda Daftar Yayasan | 5 |
| d | `izin-pendirian-panti-sosial` | Pendirian Panti Sosial | 8 |
| e | `izin-pendirian-non-panti-sosial` | Pendirian Non Panti Sosial | 8 |
| f | `izin-pub` | Izin Pengumpulan Sumbangan (PUB) | 3 |

Biaya: Rp0,00 sampai dengan tahun 2035.

Fixtures are loaded via `manage.py load_fixtures` using the engine's
`PermitType` / `WorkflowStage` / `FormField` / `DocumentRequirement` models.
