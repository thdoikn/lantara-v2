import api from "@/lib/api";

// ── Types (mirror apps/antrean serializers) ──────────────────────────────────

export type TicketStatus =
  | "reserved"
  | "checked_in"
  | "in_pool"
  | "called"
  | "serving"
  | "served"
  | "no_show"
  | "expired"
  | "cancelled";

export interface Layanan {
  id: string;
  key: string;
  name: string;
  category: "cepat" | "sedang" | "lama";
  avg_minutes: number;
  daily_quota: number | null;
  instansi: string;
  instansi_key: string;
  instansi_name: string;
  is_active: boolean;
  /** Live count of people waiting today (reserved + in pool). */
  waiting: number;
}

export interface Instansi {
  id: string;
  key: string;
  name: string;
  short_name: string;
  description: string;
  owner_type: "oikn" | "external";
  logo_url: string | null;
  operating_open: string | null;
  operating_close: string | null;
  break_start: string | null;
  break_end: string | null;
  layanan: Layanan[];
}

export interface StaffAssignment {
  id: string;
  user: string;
  user_name: string;
  user_email: string;
  instansi: string;
  instansi_name: string;
  loket: string | null;
  loket_code: string | null;
  role_scope: "tenant_admin" | "loket_operator";
  is_active: boolean;
}

export interface StaffUser {
  id: string;
  email: string;
  full_name: string;
}

export interface Ticket {
  id: string;
  number: string;
  seq: number;
  channel: "online" | "walkin";
  status: TicketStatus;
  is_priority: boolean;
  is_demoted: boolean;
  layanan: string;
  layanan_name: string;
  instansi_name: string;
  service_date: string;
  taken_at: string;
  estimated_call_at: string | null;
  checkin_at: string | null;
  checkin_deadline: string | null;
  called_at: string | null;
  recall_count: number;
  served_at: string | null;
  loket: string | null;
  loket_code: string | null;
  ahead: number | null;
  // Detail-only:
  holder_email?: string;
  qr_data_url?: string;
  pdf_url?: string | null;
  /** How many later numbers were called ahead while un-checked-in. */
  skipped?: number;
  /** Skips after which an un-checked-in number is voided. */
  skip_limit?: number;
}

export interface Loket {
  id: string;
  code: string;
  name: string;
  instansi: string;
  instansi_key: string;
  layanan: string[];
  is_open: boolean;
  current_operator: string | null;
  operator_name: string | null;
}

export interface BoardRow {
  loket: string;
  now_serving: string | null;
  status: string;
}

export interface BoardData {
  instansi: string;
  loket: BoardRow[];
}

// ── Public catalog ────────────────────────────────────────────────────────────

export async function listInstansi(): Promise<Instansi[]> {
  const { data } = await api.get("/antrean/instansi/");
  return data.results ?? data;
}

// ── Citizen (online-virtual, logged in) ──────────────────────────────────────

export async function takeTicket(layanan: string, isPriority = false): Promise<Ticket> {
  const { data } = await api.post("/antrean/tickets/", {
    layanan,
    is_priority: isPriority,
  });
  return data;
}

export async function getTicket(id: string): Promise<Ticket> {
  const { data } = await api.get(`/antrean/tickets/${id}/`);
  return data;
}

export async function myTickets(): Promise<Ticket[]> {
  const { data } = await api.get("/antrean/tickets/");
  return data;
}

export async function checkInTicket(id: string): Promise<Ticket> {
  const { data } = await api.post(`/antrean/tickets/${id}/check-in/`);
  return data;
}

export async function cancelTicket(id: string): Promise<Ticket> {
  const { data } = await api.post(`/antrean/tickets/${id}/cancel/`);
  return data;
}

export async function resendTicketEmail(id: string): Promise<{ detail: string }> {
  const { data } = await api.post(`/antrean/tickets/${id}/email/`);
  return data;
}

export function ticketPdfUrl(id: string): string {
  return `/api/v1/antrean/tickets/${id}/pdf/`;
}

// ── Walk-in kiosk (anonymous) + check-in station ─────────────────────────────

export async function kioskTake(payload: {
  layanan: string;
  is_priority?: boolean;
  holder_name?: string;
  holder_email?: string;
}): Promise<Ticket> {
  const { data } = await api.post("/antrean/kiosk/take/", payload);
  return data;
}

export async function scanCheckIn(ticketId: string): Promise<Ticket> {
  const { data } = await api.post("/antrean/checkin/", { ticket: ticketId });
  return data;
}

// ── Operator ────────────────────────────────────────────────────────────────

export async function listLoket(): Promise<Loket[]> {
  const { data } = await api.get("/antrean/loket/");
  return data.results ?? data;
}

export async function openLoket(id: string): Promise<Loket> {
  const { data } = await api.post(`/antrean/loket/${id}/open/`);
  return data;
}

export async function closeLoket(id: string): Promise<Loket> {
  const { data } = await api.post(`/antrean/loket/${id}/close/`);
  return data;
}

export async function callNext(loketId: string): Promise<Ticket | null> {
  const res = await api.post(`/antrean/loket/${loketId}/call-next/`);
  return res.status === 204 ? null : res.data;
}

export type TicketAction = "recall" | "serve" | "complete" | "no-show";

export async function ticketAction(id: string, action: TicketAction): Promise<Ticket> {
  const { data } = await api.post(`/antrean/tickets/${id}/${action}/`);
  return data;
}

export async function retriageTicket(id: string, layanan: string): Promise<Ticket> {
  const { data } = await api.post(`/antrean/tickets/${id}/retriage/`, { layanan });
  return data;
}

export interface LoketQueue {
  waiting: number;
  next_up: Ticket[];
}

export async function loketQueue(loketId: string): Promise<LoketQueue> {
  const { data } = await api.get(`/antrean/loket/${loketId}/queue/`);
  return data;
}

// ── Public board ──────────────────────────────────────────────────────────────

export async function getBoard(instansiKey: string): Promise<BoardData> {
  const { data } = await api.get(`/antrean/display-board/${instansiKey}/`);
  return data;
}

// ── Tenant admin: tenants, lokets, services, operators ───────────────────────

export async function adminListInstansi(): Promise<Instansi[]> {
  const { data } = await api.get("/antrean/admin/instansi/");
  return data.results ?? data;
}

export async function updateInstansi(id: string, patch: Partial<Instansi>): Promise<Instansi> {
  const { data } = await api.patch(`/antrean/admin/instansi/${id}/`, patch);
  return data;
}

export interface InstansiInput {
  key: string;
  name: string;
  short_name?: string;
  owner_type: "oikn" | "external";
  direktorat?: string | null;
}

export async function createInstansi(input: InstansiInput): Promise<Instansi> {
  const { data } = await api.post("/antrean/admin/instansi/", input);
  return data;
}

export async function deleteInstansi(id: string): Promise<void> {
  await api.delete(`/antrean/admin/instansi/${id}/`);
}

export interface LoketInput {
  instansi: string;
  code: string;
  name?: string;
  layanan?: string[];
}

export async function createLoket(input: LoketInput): Promise<Loket> {
  const { data } = await api.post("/antrean/loket/", input);
  return data;
}

export async function updateLoket(id: string, patch: Partial<LoketInput>): Promise<Loket> {
  const { data } = await api.patch(`/antrean/loket/${id}/`, patch);
  return data;
}

export async function deleteLoket(id: string): Promise<void> {
  await api.delete(`/antrean/loket/${id}/`);
}

export async function adminListLayanan(): Promise<Layanan[]> {
  const { data } = await api.get("/antrean/layanan/");
  return data.results ?? data;
}

export async function updateLayanan(id: string, patch: Partial<Layanan>): Promise<Layanan> {
  const { data } = await api.patch(`/antrean/layanan/${id}/`, patch);
  return data;
}

export async function listStaff(): Promise<StaffAssignment[]> {
  const { data } = await api.get("/antrean/staff/");
  return data.results ?? data;
}

export async function createStaff(input: {
  user: string;
  instansi: string;
  loket?: string | null;
  role_scope?: string;
}): Promise<StaffAssignment> {
  const { data } = await api.post("/antrean/staff/", {
    role_scope: "loket_operator",
    ...input,
  });
  return data;
}

export async function deleteStaff(id: string): Promise<void> {
  await api.delete(`/antrean/staff/${id}/`);
}

export async function searchStaffUsers(
  q: string,
  role: "loket_operator" | "tenant_admin" = "loket_operator",
): Promise<StaffUser[]> {
  const { data } = await api.get("/antrean/staff-users/", { params: { q, role } });
  return data;
}
