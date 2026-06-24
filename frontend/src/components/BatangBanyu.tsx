import { useId } from "react";

/**
 * Batang Banyu — the IKN "flowing/braided river" motif.
 *
 * Hand-authored, seamless SVG weave (NOT the old concentric-ellipse border).
 * What makes it read as *batang banyu* rather than a generic ethnic border:
 *   1. Continuous horizontal lanes that BRAID over/under each other (real
 *      weave via an SVG mask that breaks the under-strand at crossings).
 *   2. Elongated lens/eye voids between crossings, each with a nested stroke.
 *   3. Two interlocked rows offset by half a period, like braided channels.
 *
 * The tile is `userSpaceOnUse` 120×56 so it repeats seamlessly both
 * horizontally (strip seams) and vertically (hero fill texture). Colour is
 * `currentColor` so callers theme it with a text-colour utility (gold tokens)
 * — no hardcoded hex, satisfies the "tokens only" rule.
 */

const TW = 120; // tile width (2 periods)
const TH = 56; // tile height
const P = 60; // wave period
const AMP = 8; // wave amplitude
const STEP = 2; // sampling resolution (visually smooth at this stroke)

function wavePath(cy: number, phase: number): string {
  let d = "";
  for (let x = 0; x <= TW; x += STEP) {
    const y = cy + AMP * Math.sin((2 * Math.PI * x) / P + phase);
    d += x === 0 ? `M${x} ${y.toFixed(2)}` : ` L${x} ${y.toFixed(2)}`;
  }
  return d;
}

interface Ribbon {
  cy: number;
  phase: number;
  /** x positions where the lower strand is broken (upper strand passes over) */
  holes: number[];
  /** x positions of lens bulges — get a nested concentric stroke */
  bulges: number[];
  /** all crossing points — get a small woven knot */
  crossings: number[];
}

// Two ribbons offset by a quarter period so row 2's bulges sit over row 1's
// crossings — the interlock that sells the braid.
const RIBBONS: Ribbon[] = [
  { cy: 14, phase: 0, holes: [0, 60, 120], bulges: [15, 45, 75, 105], crossings: [0, 30, 60, 90, 120] },
  { cy: 42, phase: Math.PI / 2, holes: [15, 75], bulges: [0, 30, 60, 90, 120], crossings: [15, 45, 75, 105] },
];

export interface BatangBanyuProps {
  /** "strip" = fixed-height seam band; "fill" = absolutely-positioned texture */
  variant?: "strip" | "fill";
  /** strip height in px (ignored for fill) */
  height?: number;
  opacity?: number;
  /** mirror vertically (for the top edge of a footer, etc.) */
  flip?: boolean;
  className?: string;
}

export default function BatangBanyu({
  variant = "strip",
  height = 56,
  opacity = 1,
  flip = false,
  className = "",
}: BatangBanyuProps) {
  const rawId = useId().replace(/:/g, "");
  const patternId = `bb-${rawId}`;
  const maskId = `bbm-${rawId}`;

  const svg = (
    <svg
      width="100%"
      height="100%"
      preserveAspectRatio={variant === "strip" ? "xMidYMid slice" : "xMidYMid"}
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity, color: "inherit", display: "block" }}
      aria-hidden="true"
    >
      <defs>
        {/* White = visible. Black dots break the under-strand at crossings. */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={TW} height={TH}>
          <rect x="0" y="0" width={TW} height={TH} fill="white" />
          {RIBBONS.flatMap((r) =>
            r.holes.map((x) => (
              <circle key={`${r.cy}-${x}`} cx={x} cy={r.cy} r={4.5} fill="black" />
            )),
          )}
        </mask>

        <pattern id={patternId} x="0" y="0" width={TW} height={TH} patternUnits="userSpaceOnUse">
          {RIBBONS.map((r, i) => {
            const phaseUp = r.phase;
            const phaseDown = r.phase + Math.PI; // anti-phase = the braiding partner
            return (
              <g key={i} fill="none" stroke="currentColor">
                {/* upper strand — drawn fully (passes over at hole points) */}
                <path d={wavePath(r.cy, phaseUp)} strokeWidth={1.4} />
                {/* lower strand — masked so it breaks where the upper passes over */}
                <path d={wavePath(r.cy, phaseDown)} strokeWidth={1.4} mask={`url(#${maskId})`} />
                {/* nested lens stroke inside each bulge */}
                {r.bulges.map((x) => (
                  <ellipse key={`l-${x}`} cx={x} cy={r.cy} rx={7} ry={4.2} strokeWidth={1} opacity={0.65} />
                ))}
                {/* woven knot at each crossing */}
                {r.crossings.map((x) => (
                  <circle key={`k-${x}`} cx={x} cy={r.cy} r={1.4} fill="currentColor" stroke="none" opacity={0.8} />
                ))}
              </g>
            );
          })}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );

  if (variant === "fill") {
    return (
      <div
        className={`absolute inset-0 pointer-events-none ${className}`}
        style={{ transform: flip ? "scaleY(-1)" : undefined, lineHeight: 0 }}
        aria-hidden="true"
      >
        {svg}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: `${height}px`,
        transform: flip ? "scaleY(-1)" : undefined,
        flexShrink: 0,
        lineHeight: 0,
      }}
      aria-hidden="true"
    >
      {svg}
    </div>
  );
}
