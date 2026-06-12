/**
 * RDTR (Rencana Detail Tata Ruang) — Phase 3.
 * Map view with mock IKN zone overlay + KBLI compatibility checker.
 * Uses MapLibre GL (no API key required — OpenFreeMap tile source).
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Info, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/cn";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RDTRZone {
  zone_code: string;
  name: string;
  zone_type: string;
  bbox: number[];
  allowed_sektors: string[];
  description: string;
  source: string;
}

interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      zone_code: string;
      name: string;
      zone_type: string;
      allowed_sektors: string[];
      description: string;
    };
    geometry: object;
  }>;
}

interface KBLICheckResult {
  kbli: string;
  kbli_name: string;
  zone_code: string;
  zone_name: string;
  is_compatible: boolean;
  requires_special_permit: boolean;
  notes: string;
  source: string;
}

// ── Zone type colours (categorical map palette, royal-anchored) ───────────────

const ZONE_COLORS: Record<string, string> = {
  perkantoran: "#1E40AF",   // royal — civic/office
  perumahan: "#3B82F6",     // royal-400 — residential
  perdagangan: "#D4A017",   // gold — commerce
  pendidikan: "#7C5CBF",
  kesehatan: "#2CA0B5",
  rth: "#2F6B2E",           // green open space (cartographic convention)
  industri: "#64748B",
  campuran: "#E8884A",
  transportasi: "#03061A",  // royal-950 — infrastructure
  pertanian: "#8BC34A",
};

const ZONE_TYPE_LABEL: Record<string, string> = {
  perkantoran: "Perkantoran",
  perumahan: "Perumahan",
  perdagangan: "Perdagangan & Jasa",
  pendidikan: "Sarana Pendidikan",
  kesehatan: "Sarana Kesehatan",
  rth: "Ruang Terbuka Hijau",
  industri: "Industri",
  campuran: "Campuran",
  transportasi: "Transportasi",
  pertanian: "Pertanian",
};

// ── KBLI checker panel ────────────────────────────────────────────────────────

function KBLIChecker({ zones }: { zones: RDTRZone[] }) {
  const [kbli, setKbli] = useState("");
  const [zoneCode, setZoneCode] = useState("");
  const [result, setResult] = useState<KBLICheckResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCheck() {
    if (!kbli.trim() || !zoneCode) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await api.get(`/rdtr/kbli-check/?kbli=${kbli.trim()}&zone=${zoneCode}`);
      setResult(r.data);
    } catch (e: unknown) {
      const axiosErr = e as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail ?? "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-buana mb-1">Kode KBLI</label>
        <input
          value={kbli}
          onChange={(e) => setKbli(e.target.value)}
          placeholder="Contoh: 47111"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-khatulistiwa"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-buana mb-1">Zona</label>
        <select
          value={zoneCode}
          onChange={(e) => setZoneCode(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-khatulistiwa"
        >
          <option value="">— Pilih Zona —</option>
          {zones.map((z) => (
            <option key={z.zone_code} value={z.zone_code}>
              {z.zone_code} — {z.name}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={handleCheck}
        disabled={loading || !kbli.trim() || !zoneCode}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-khatulistiwa py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        <Search className="h-4 w-4" />
        {loading ? "Memeriksa…" : "Cek Kompatibilitas"}
      </button>

      {error && (
        <div className="rounded-lg bg-saka/5 border border-saka/20 px-3 py-2 text-sm text-saka">
          {error}
        </div>
      )}

      {result && (
        <div
          className={cn(
            "rounded-xl border p-4 space-y-2",
            result.is_compatible
              ? "border-jagawana/30 bg-jagawana/5"
              : "border-saka/30 bg-saka/5"
          )}
        >
          <div className="flex items-center gap-2">
            {result.is_compatible ? (
              <CheckCircle2 className="h-5 w-5 text-jagawana" />
            ) : (
              <XCircle className="h-5 w-5 text-saka" />
            )}
            <span
              className={cn(
                "text-sm font-semibold",
                result.is_compatible ? "text-jagawana" : "text-saka"
              )}
            >
              {result.is_compatible ? "Kompatibel" : "Tidak Kompatibel"}
            </span>
            {result.requires_special_permit && (
              <span className="flex items-center gap-1 text-xs text-terakota font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                Perlu Izin Khusus
              </span>
            )}
          </div>
          <p className="text-xs font-medium">KBLI {result.kbli}: {result.kbli_name}</p>
          <p className="text-xs text-buana">Zona: {result.zone_name}</p>
          {result.notes && <p className="text-xs text-buana italic">{result.notes}</p>}
          <p className="text-xs text-buana/60">Sumber: {result.source} · Data mock IKN</p>
        </div>
      )}
    </div>
  );
}

// ── Map component (MapLibre GL via dynamic import) ────────────────────────────

function RDTRMap({
  geojson,
  onZoneClick,
}: {
  geojson: GeoJSONFeatureCollection | null;
  onZoneClick: (props: RDTRZone | null) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Dynamic import so the bundle only loads when this component mounts
    import("maplibre-gl").then(({ default: maplibregl }) => {
      // Import MapLibre CSS
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@4.5.0/dist/maplibre-gl.css";
      document.head.appendChild(link);

      const map = new maplibregl.Map({
        container: mapRef.current!,
        // OpenFreeMap — no API key needed
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [116.72, -0.85],
        zoom: 11,
      });

      mapInstance.current = map;

      map.on("load", () => {
        if (!geojson) return;

        // Cast through unknown — our local GeoJSONFeatureCollection matches structurally
        // but TypeScript can't verify against maplibre-gl's bundled @types/geojson
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.addSource("rdtr-zones", { type: "geojson", data: geojson as any });

        // Fill layer with zone-type colours
        map.addLayer({
          id: "rdtr-fill",
          type: "fill",
          source: "rdtr-zones",
          paint: {
            "fill-color": [
              "match",
              ["get", "zone_type"],
              "perkantoran", ZONE_COLORS.perkantoran,
              "perumahan", ZONE_COLORS.perumahan,
              "perdagangan", ZONE_COLORS.perdagangan,
              "pendidikan", ZONE_COLORS.pendidikan,
              "kesehatan", ZONE_COLORS.kesehatan,
              "rth", ZONE_COLORS.rth,
              "industri", ZONE_COLORS.industri,
              "campuran", ZONE_COLORS.campuran,
              "#64748B",
            ],
            "fill-opacity": 0.35,
          },
        });

        // Stroke
        map.addLayer({
          id: "rdtr-stroke",
          type: "line",
          source: "rdtr-zones",
          paint: { "line-color": "#ffffff", "line-width": 1.5 },
        });

        // Hover cursor
        map.on("mousemove", "rdtr-fill", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "rdtr-fill", () => {
          map.getCanvas().style.cursor = "";
        });

        // Click → show zone info
        map.on("click", "rdtr-fill", (e) => {
          if (e.features && e.features.length > 0) {
            onZoneClick(e.features[0].properties as RDTRZone);
          }
        });
      });
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update GeoJSON source when data loads
  useEffect(() => {
    if (!mapInstance.current || !geojson) return;
    const map = mapInstance.current;
    if (map.getSource("rdtr-zones")) {
      map.getSource("rdtr-zones").setData(geojson);
    }
  }, [geojson]);

  return <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />;
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  const items = Object.entries(ZONE_COLORS).map(([type, color]) => ({
    type,
    color,
    label: ZONE_TYPE_LABEL[type] ?? type,
  }));

  return (
    <div className="rounded-xl border border-border bg-white/95 backdrop-blur p-3 space-y-1.5">
      <p className="text-xs font-semibold mb-2">Legenda Zona</p>
      {items.map((item) => (
        <div key={item.type} className="flex items-center gap-2">
          <div
            className="h-3 w-5 rounded-sm opacity-70"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-buana">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RDTRPage() {
  const [selectedZone, setSelectedZone] = useState<RDTRZone | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "kbli">("info");

  const { data: zones = [] } = useQuery<RDTRZone[]>({
    queryKey: ["rdtr", "zones-list"],
    queryFn: () =>
      api.get<{ features: Array<{ properties: RDTRZone }> }>("/rdtr/zones/").then((r) =>
        r.data.features.map((f) => f.properties)
      ),
  });

  const { data: geojson = null } = useQuery<GeoJSONFeatureCollection>({
    queryKey: ["rdtr", "geojson"],
    queryFn: () => api.get("/rdtr/zones/").then((r) => r.data),
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Map (fills remaining space) */}
      <div className="relative flex-1">
        <RDTRMap geojson={geojson} onZoneClick={setSelectedZone} />

        {/* Mock data disclaimer */}
        <div className="absolute bottom-3 left-3 rounded-lg bg-terakota/10 border border-terakota/30 px-3 py-1.5 text-xs text-terakota font-medium flex items-center gap-1.5 pointer-events-none">
          <AlertTriangle className="h-3.5 w-3.5" />
          Data spasial mock — bukan OneMap resmi
        </div>

        {/* Legend */}
        <div className="absolute top-3 left-3">
          <Legend />
        </div>
      </div>

      {/* Side panel */}
      <div className="w-80 border-l border-border flex flex-col bg-background">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-khatulistiwa" />
            <h1 className="font-display font-semibold text-sm">RDTR IKN</h1>
          </div>
          <p className="text-xs text-buana">
            Rencana Detail Tata Ruang Ibu Kota Nusantara — data mock
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["info", "kbli"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium transition-colors",
                activeTab === tab
                  ? "border-b-2 border-khatulistiwa text-khatulistiwa"
                  : "text-buana hover:text-foreground"
              )}
            >
              {tab === "info" ? "Info Zona" : "Cek KBLI"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "info" ? (
            selectedZone ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div
                    className="mt-1 h-3 w-3 rounded-sm shrink-0 opacity-70"
                    style={{ backgroundColor: ZONE_COLORS[selectedZone.zone_type] ?? "#4B5E8A" }}
                  />
                  <div>
                    <p className="font-semibold text-sm">{selectedZone.name}</p>
                    <p className="text-xs text-buana mt-0.5">
                      {ZONE_TYPE_LABEL[selectedZone.zone_type] ?? selectedZone.zone_type}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-buana">Kode Zona</span>
                    <span className="font-mono font-medium">{selectedZone.zone_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-buana">Sumber</span>
                    <span className="font-medium">{selectedZone.source}</span>
                  </div>
                </div>

                {selectedZone.description && (
                  <p className="text-xs text-buana leading-relaxed">{selectedZone.description}</p>
                )}

                {selectedZone.allowed_sektors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1.5">Sektor KBLI yang Diizinkan</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedZone.allowed_sektors.map((s) => (
                        <span
                          key={s}
                          className="rounded-md bg-khatulistiwa/10 px-2 py-0.5 text-xs font-mono text-khatulistiwa"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setActiveTab("kbli")}
                  className="w-full rounded-lg border border-khatulistiwa/30 py-2 text-xs font-medium text-khatulistiwa hover:bg-khatulistiwa/5 transition-colors"
                >
                  Cek KBLI untuk zona ini →
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Info className="h-8 w-8 text-buana/40 mb-2" />
                <p className="text-sm text-buana">Klik zona di peta untuk melihat detail</p>
              </div>
            )
          ) : (
            <KBLIChecker zones={zones} />
          )}
        </div>
      </div>
    </div>
  );
}
