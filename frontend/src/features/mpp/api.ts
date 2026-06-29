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
  permit_type: string | null;
  is_active: boolean;
}

export interface Instansi {
  id: string;
  key: string;
  name: string;
  short_name: string;
  description: string;
  layanan: Layanan[];
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
  submission: string | null;
  ahead: number | null;
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

// ── Citizen ───────────────────────────────────────────────────────────────────

export interface TakeTicketPayload {
  /** Optional when `submission` is given — resolved from the izin's permit type. */
  layanan?: string;
  channel?: "online" | "walkin";
  submission?: string | null;
  is_priority?: boolean;
}

export async function takeTicket(payload: TakeTicketPayload): Promise<Ticket> {
  const { data } = await api.post("/antrean/tickets/", payload);
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

export async function listInstansi(): Promise<Instansi[]> {
  const { data } = await api.get("/antrean/instansi/");
  return data.results ?? data;
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

// ── Public board ──────────────────────────────────────────────────────────────

export async function getBoard(instansiKey: string): Promise<BoardData> {
  const { data } = await api.get(`/antrean/display-board/${instansiKey}/`);
  return data;
}
