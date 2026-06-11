// ── Engine types ──────────────────────────────────────────────────────────────

export interface Sektor {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  permit_count: number;
  pengampu: string;
}

export interface WorkflowStage {
  id: string;
  key: string;
  order: number;
  name: string;
  stage_type: "verification" | "payment" | "external" | "publish" | "collection";
  actor_role: string;
  sla_hours: number;
  requires_site_visit: boolean;
  allowed_actions: string[];
  is_terminal: boolean;
  instructions: string;
}

export interface FormField {
  id: string;
  key: string;
  label: string;
  field_type:
    | "text" | "textarea" | "number" | "currency" | "date"
    | "select" | "multiselect" | "file" | "boolean"
    | "nik" | "npwp" | "phone" | "tel" | "email"
    | "geo" | "map_point";
  section: string;
  order: number;
  required: boolean;
  validation_json: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    patternMessage?: string;
    placeholder?: string;
    help_text?: string;
    acceptedTypes?: string;
    [key: string]: unknown;
  };
  options_json: Array<{ value: string; label: string }>;
  prefill_from_profile: boolean;
  conditional_field_key?: string;
  conditional_field_value?: string;
  help_text_field: string;
  placeholder: string;
}

export interface DocumentRequirement {
  id: string;
  key: string;
  title: string;
  description: string;
  allowed_types: string[];
  max_bytes: number;
  is_required: boolean;
  order: number;
  conditional_field_key?: string;
  conditional_field_value?: string;
}

export interface PermitType {
  id: string;
  key: string;
  name: string;
  sektor_key: string;
  sektor_name: string;
  is_berusaha: boolean;
  oss_covered: boolean;
  oss_deeplink?: string;
  sla_days: number;
  product_name: string;
  legal_basis: string[];
  fee_description: string;
  complaint_info: string;
  is_published: boolean;
  schema_version: number;
  stages: WorkflowStage[];
  form_fields: FormField[];
  document_requirements: DocumentRequirement[];
}

// ── Auth types ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  nik: string;
  phone: string;
  whatsapp_number: string;
  avatar: string | null;
  is_email_verified: boolean;
  is_staff: boolean;
  last_seen: string | null;
  created_at: string;
  profile: ApplicantProfile | null;
  roles: string[];
}

export interface ApplicantProfile {
  birth_place: string;
  birth_date: string | null;
  gender: "male" | "female" | "";
  religion: string;
  npwp: string;
  institution_name: string;
  institution_type: string;
  position: string;
  address: string;
  rt_rw: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten_kota: string;
  provinsi: string;
  kode_pos: string;
  profile_complete: boolean;
}

// ── Submission types ──────────────────────────────────────────────────────────

export type SubmissionStatus =
  | "draft" | "submitted" | "under_review"
  | "awaiting_revision" | "revision_submitted"
  | "site_visit_scheduled" | "approved" | "rejected" | "issued";

export interface AuditEntry {
  id: string;
  action: string;
  actor_name: string;
  is_applicant_action: boolean;
  from_stage_key: string;
  to_stage_key: string;
  from_status: string;
  to_status: string;
  notes: string;
  created_at: string;
}

export interface RevisionField {
  id: string;
  field_key: string;
  is_doc_requirement: boolean;
  note: string;
  is_resolved: boolean;
}

export interface Submission {
  id: string;
  reference_number: string;
  status: SubmissionStatus;
  permit_type_key: string;
  permit_type_name: string;
  sektor_name: string;
  applicant_name: string;
  applicant_email: string;
  form_data: Record<string, unknown>;
  schema_version_snapshot: number;
  schema_snapshot: {
    stages: Array<{ key: string; name: string; order: number }>;
    form_fields: Array<{ key: string; label: string }>;
    document_requirements: DocumentRequirement[];
  };
  current_stage_key: string;
  current_stage_order: number;
  sla_due_at: string | null;
  is_sla_breached: boolean;
  is_sla_at_risk: boolean;
  stage_sla_due_at: string | null;
  submitted_at: string | null;
  rejection_reason: string;
  issued_permit_id: string | null;
  issued_permit_validation_uuid: string | null;
  created_at: string;
  updated_at: string;
  revision_fields: RevisionField[];
}

export interface UploadedDocument {
  id: string;
  requirement_key: string;
  requirement_title: string;
  original_filename: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  status: "pending" | "valid" | "invalid" | "infected";
  validation_error: string;
  is_active: boolean;
  revision_round: number;
  created_at: string;
}

// ── Notification ──────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  notif_type: string;
  title: string;
  body: string;
  is_read: boolean;
  action_url: string;
  submission_id: string | null;
  created_at: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
