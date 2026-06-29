// Shared human labels for workflow stage keys and stage actor roles.
// Single source of truth so the verifier workspace, admin, and public detail
// page render the SK's two-bidang flow consistently. Unknown keys fall back to
// a humanised version of the slug/string (descriptive actor_role strings from
// the SK fixtures are already readable, so they pass through unchanged).

const STAGE_LABELS: Record<string, string> = {
  // SK two-bidang flow (current)
  "submit": "Pengajuan Pemohon",
  "verifikasi-berkas": "Verifikasi Berkas",
  "verifikasi-data": "Verifikasi Data & Lapangan",
  "reviu-hukum": "Reviu Hukum",
  "penerbitan": "Penerbitan Izin",
  "pengambilan": "Pengambilan / Penyerahan",
  // Legacy stage keys (older fixtures / in-flight submissions)
  "pengajuan": "Pengajuan Pemohon",
  "verifikasi": "Verifikasi Tim Teknis",
  "verifikasi-teknis": "Verifikasi Tim Teknis",
  "tim-teknis-verifikasi": "Verifikasi Tim Teknis",
  "kunjungan-lapangan": "Kunjungan Lapangan",
  "penyerahan": "Penyerahan ke Pemohon",
};

export function stageLabel(key: string | null | undefined): string {
  if (!key) return "";
  return STAGE_LABELS[key] ?? key.replace(/-/g, " ");
}

const ROLE_LABELS: Record<string, string> = {
  applicant: "Pemohon",
  verifier: "Tim Verifikator Teknis",
  approver: "Kepala Otorita IKN",
  staff: "Petugas Loket / WhatsApp",
};

export function formatActorRole(role: string | null | undefined): string {
  if (!role) return "";
  if (ROLE_LABELS[role]) return ROLE_LABELS[role];
  // Descriptive SK strings (e.g. "Bidang Perizinan / Deputi …") are already
  // human-readable; only title-case bare snake_case keys.
  if (/^[a-z0-9_]+$/.test(role)) {
    return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ");
  }
  return role;
}
