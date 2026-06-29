// Official IKN "Satu Nomor" + pengaduan channels — single source of truth.
// These mirror the SK Standar Pelayanan pengaduan block (identical across izin),
// so the UI renders them from here instead of repeating long complaint_info text.

export const WA_NUMBER_DISPLAY = "+62 811-5000-5555";
export const WA_NUMBER_E164 = "6281150005555";
export const WA_LINK = `https://wa.me/${WA_NUMBER_E164}`;

export const WEBSITE_DISPLAY = "ikn.go.id";
export const WEBSITE_URL = "https://ikn.go.id";
export const EMAIL = "ditp5@ikn.go.id";
export const INSTAGRAM_HANDLE = "@pp_ikn";
export const INSTAGRAM_URL = "https://instagram.com/pp_ikn";
export const SP4N_DISPLAY = "SP4N Lapor!";
export const SP4N_URL = "https://www.lapor.go.id";

export type ContactChannelKey =
  | "whatsapp" | "website" | "email" | "instagram" | "sp4n";

export interface ContactChannel {
  key: ContactChannelKey;
  label: string;
  value: string;
  href: string;
  external?: boolean;
}

// Ordered for display (WhatsApp first — the primary "Satu Nomor" channel).
export const CONTACT_CHANNELS: ContactChannel[] = [
  { key: "whatsapp",  label: "WhatsApp",   value: WA_NUMBER_DISPLAY, href: WA_LINK,        external: true },
  { key: "website",   label: "Website",    value: WEBSITE_DISPLAY,   href: WEBSITE_URL,     external: true },
  { key: "email",     label: "Email",      value: EMAIL,             href: `mailto:${EMAIL}` },
  { key: "instagram", label: "Instagram",  value: INSTAGRAM_HANDLE,  href: INSTAGRAM_URL,   external: true },
  { key: "sp4n",      label: "SP4N Lapor!", value: "lapor.go.id",    href: SP4N_URL,        external: true },
];
