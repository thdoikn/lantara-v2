# Sektor Kesehatan — 31 Izin (SK-complete)

Ground truth: **SK Standar Pelayanan Perizinan Sektor Kesehatan di Ibu Kota Nusantara** (Keputusan Kepala Otorita IKN, 2026). The previous fixtures were replaced entirely — their izin list did not match the SK. Each fixture reproduces the SK's Persyaratan → `doc_requirements`, Sistem/Mekanisme → `stages`, Jangka Waktu → `sla_days`, Produk → `product_name`, Dasar Hukum → `legal_basis`, and pengaduan channels → `complaint_info`.

Pengampu: Direktorat Pelayanan Dasar (Dit. Yandas).

## Workflow (two-bidang, 5 stages — per SK swimlane)
`submit → verifikasi-berkas (Bidang Perizinan) → verifikasi-data (Bidang Pelayanan Dasar, + visitasi lapangan) → penerbitan (Kepala Otorita) → pengambilan`.

**Exception — `pencabutan-sip`:** stage 3 is `reviu-hukum` (Bidang Hukum / Direktorat Hukum), no site visit.

## Izin (SK Diktum KETIGA a–ee)

| # | Key | SLA |
|---|-----|-----|
| a | `izin-operasional-rs-unggulan` | 15 |
| b | `izin-upkp-puskesmas` | 15 |
| c | `izin-klinik-pratama-utama` | 15 |
| d | `sip-dokter-dokter-gigi` | 3 |
| e | `sip-bidan` | 3 |
| f | `sip-perawat` | 3 |
| g | `sip-apoteker` | 3 |
| h | `sip-ttk-vokasi-farmasi` | 3 |
| i | `sip-tenaga-gizi` | 3 |
| j | `sip-atlm` | 3 |
| k | `sip-psikolog-klinis` | 3 |
| l | `sip-refraksionis-optisien` | 3 |
| m | `sip-optometris` | 3 |
| n | `sip-fisioterapis` | 3 |
| o | `sip-terapis-wicara` | 3 |
| p | `sip-okupasi-terapis` | 3 |
| q | `sip-radiografer` | 3 |
| r | `sip-penata-anestesi` | 3 |
| s | `sip-ortotis-prostetis` | 3 |
| t | `sip-tenaga-sanitarian` | 3 |
| u | `sip-elektromedis` | 3 |
| v | `sip-perekam-medis` | 3 |
| w | `sip-fisika-medis` | 3 |
| x | `stpt-penyehat-tradisional` | 3 |
| y | `sip-teknisi-gigi-mulut` | 3 |
| z | `sip-teknisi-kardiovaskuler` | 3 |
| aa | `sip-teknisi-pelayanan-darah` | 3 |
| bb | `perpanjangan-sip` | 3 |
| cc | `pencabutan-sip` | 5 (Bidang Hukum) |
| dd | `izin-tempat-praktik-dokter` | 15 |
| ee | `izin-tempat-praktik-bidan-perawat` | 15 |

Biaya: Rp0,00 sampai dengan tahun 2035. The 23 standard SIP share a canonical
persyaratan template (KTP, STR, ijazah, surat tempat praktik, pasfoto, SIP
sebelumnya, foto papan nama) varied per profession (STR label, product_name,
dasar hukum).
