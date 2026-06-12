/**
 * Deterministic, purely-cosmetic visual identity per sektor.
 * Picks a lucide icon (semantic when the name hints at one, else a stable
 * hash-chosen icon) and a dark-navy-friendly accent variant. Stable per
 * sektor key so a sektor always looks the same regardless of list order.
 * This is presentation only — no engine/business logic branches on sektor.
 */
import {
  HeartPulse, GraduationCap, HandHeart, Building2, Briefcase,
  Leaf, Scale, Truck, Landmark, ShoppingBag, Users, FileText,
  type LucideIcon,
} from "lucide-react";

export interface SektorVisual {
  Icon: LucideIcon;
  iconWrap: string;
  iconText: string;
  badge: string;
  link: string;
  via: string; // top-edge gradient accent
  dot: string;
}

const VARIANTS: Omit<SektorVisual, "Icon">[] = [
  { iconWrap: "bg-blue-500/20",    iconText: "text-blue-300",    badge: "bg-blue-500/20 text-blue-300",       link: "text-blue-400 hover:text-blue-300",       via: "before:via-blue-400/40",    dot: "bg-blue-400" },
  { iconWrap: "bg-gold-500/20",    iconText: "text-gold-300",    badge: "bg-gold-500/20 text-gold-300",       link: "text-gold-300 hover:text-gold-200",       via: "before:via-gold-400/50",    dot: "bg-gold-400" },
  { iconWrap: "bg-cyan-500/20",    iconText: "text-cyan-300",    badge: "bg-cyan-500/20 text-cyan-300",       link: "text-cyan-300 hover:text-cyan-200",       via: "before:via-cyan-400/40",    dot: "bg-cyan-400" },
  { iconWrap: "bg-violet-500/20",  iconText: "text-violet-300",  badge: "bg-violet-500/20 text-violet-300",   link: "text-violet-300 hover:text-violet-200",   via: "before:via-violet-400/40",  dot: "bg-violet-400" },
  { iconWrap: "bg-emerald-500/20", iconText: "text-emerald-300", badge: "bg-emerald-500/20 text-emerald-300", link: "text-emerald-300 hover:text-emerald-200", via: "before:via-emerald-400/40", dot: "bg-emerald-400" },
  { iconWrap: "bg-rose-500/20",    iconText: "text-rose-300",    badge: "bg-rose-500/20 text-rose-300",       link: "text-rose-300 hover:text-rose-200",       via: "before:via-rose-400/40",    dot: "bg-rose-400" },
];

const KEYWORD_ICONS: [RegExp, LucideIcon][] = [
  [/sehat|kesehatan|medis|rumah sakit/i, HeartPulse],
  [/didik|pendidikan|sekolah|guru/i, GraduationCap],
  [/sosial|bansos|kesejahteraan/i, HandHeart],
  [/dagang|usaha|ekonomi|umkm/i, ShoppingBag],
  [/kerja|tenaga|naker/i, Briefcase],
  [/lingkung|hutan|tani|pertanian|pangan/i, Leaf],
  [/hukum|legal|peradilan/i, Scale],
  [/transport|perhubung|hubung/i, Truck],
  [/bangun|infrastruktur|tata ruang|pekerjaan umum/i, Building2],
  [/pemerintah|publik|administrasi/i, Landmark],
  [/penduduk|warga|kependudukan/i, Users],
];

const ICON_POOL: LucideIcon[] = [
  Building2, Briefcase, Landmark, Leaf, Scale, ShoppingBag, Users, FileText,
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function getSektorVisual(key: string, name?: string): SektorVisual {
  const text = `${key} ${name ?? ""}`;
  const keywordIcon = KEYWORD_ICONS.find(([re]) => re.test(text))?.[1];
  const h = hash(key || name || "x");
  const Icon = keywordIcon ?? ICON_POOL[h % ICON_POOL.length];
  const variant = VARIANTS[h % VARIANTS.length];
  return { Icon, ...variant };
}
