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

// Nusantara accent family: khatulistiwa (blue), emerald (health-ish green),
// terakota (gold), jagawana (deep green). Used dark-on-navy in the catalog.
const VARIANTS: Omit<SektorVisual, "Icon">[] = [
  { iconWrap: "bg-khatulistiwa-600/20", iconText: "text-khatulistiwa-300", badge: "bg-khatulistiwa-600/25 text-khatulistiwa-200", link: "text-khatulistiwa-300 hover:text-khatulistiwa-200", via: "via-khatulistiwa-400/50", dot: "bg-khatulistiwa-400" },
  { iconWrap: "bg-terakota-500/20",     iconText: "text-terakota-400",     badge: "bg-terakota-500/20 text-terakota-300",        link: "text-terakota-400 hover:text-terakota-300",         via: "via-terakota-400/50",     dot: "bg-terakota-400" },
  { iconWrap: "bg-emerald-500/20",      iconText: "text-emerald-300",      badge: "bg-emerald-500/20 text-emerald-300",          link: "text-emerald-300 hover:text-emerald-200",           via: "via-emerald-400/40",      dot: "bg-emerald-400" },
  { iconWrap: "bg-jagawana-500/20",     iconText: "text-jagawana-300",     badge: "bg-jagawana-500/20 text-jagawana-300",        link: "text-jagawana-300 hover:text-jagawana-400",         via: "via-jagawana-400/40",     dot: "bg-jagawana-400" },
];

// Semantic colour by keyword so health reads green, education gold, etc.
const KEYWORD_VARIANTS: [RegExp, number][] = [
  [/sehat|kesehatan|medis|rumah sakit/i, 2], // emerald
  [/didik|pendidikan|sekolah|guru/i, 1],     // terakota
  [/sosial|bansos|kesejahteraan/i, 0],       // khatulistiwa
  [/lingkung|hutan|tani|pertanian|pangan/i, 3], // jagawana
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
  const variantIdx = KEYWORD_VARIANTS.find(([re]) => re.test(text))?.[1] ?? h % VARIANTS.length;
  const variant = VARIANTS[variantIdx];
  return { Icon, ...variant };
}
