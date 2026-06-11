# Sektor Sosial — 6 Izin Fixtures

Source: `STANDAR_PELAYANAN_SOSIAL.docx` (ground truth per CLAUDE.md §3.7)

| # | Nama Izin | SLA |
|---|-----------|-----|
| 1 | Pendaftaran LKS Berbadan Hukum | 8 hari |
| 2 | Pendaftaran LKS Tidak Berbadan Hukum | 8 hari |
| 3 | Tanda Daftar Yayasan | 5 hari |
| 4 | Izin Pendirian Panti Sosial | 8 hari |
| 5 | Izin Pendirian Non Panti Sosial | 8 hari |
| 6 | Izin Penyelenggaraan PUB (Pengumpulan Uang atau Barang) | 3 hari |

Fixtures are loaded via `manage.py load_fixtures` using the engine's
`PermitType` / `WorkflowStage` / `FormField` / `DocumentRequirement` models.
JSON files follow the engine fixture schema.
