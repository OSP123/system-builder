import { polygonCentre, TACTICAL_MAP, type Sector } from "@/lib/regions";

const { width: W, height: H } = TACTICAL_MAP;

/**
 * An auspex-style tactical plot of a region's sectors (polygons in an 800x500
 * space). Sectors without a shape are listed but not drawn. Pure SVG, so it
 * renders on the server and in the CMS preview alike.
 */
export function TacticalMap({ sectors, title }: { sectors: Sector[]; title: string }) {
  const drawn = sectors.filter((s) => s.shape);
  return (
    <figure className="cogitator p-2 sm:p-3">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Tactical map of ${title}`} className="block h-auto w-full">
        <defs>
          <pattern id="auspex-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#auspex-grid)" />
        {[90, 170, 250].map((r) => (
          <circle key={r} cx={W / 2} cy={H / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeDasharray="4 6" />
        ))}
        <line x1={W / 2} y1="0" x2={W / 2} y2={H} stroke="currentColor" strokeOpacity="0.1" />
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="currentColor" strokeOpacity="0.1" />
        {drawn.map((s, i) => {
          const [cx, cy] = s.cx !== undefined && s.cy !== undefined ? [s.cx, s.cy] : polygonCentre(s.shape!);
          // Later (higher-points) sectors glow brighter, like the original escalation map.
          const intensity = drawn.length > 1 ? i / (drawn.length - 1) : 1;
          return (
            <g key={s.name}>
              <polygon
                points={s.shape}
                fill="currentColor"
                fillOpacity={0.06 + intensity * 0.14}
                stroke="currentColor"
                strokeOpacity={0.55 + intensity * 0.35}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <text x={cx} y={cy - 4} textAnchor="middle" fill="currentColor" fontSize="15" fontFamily="var(--font-mono)" letterSpacing="1.5">
                {s.name.toUpperCase()}
              </text>
              {s.pointsLevel !== undefined && (
                <text x={cx} y={cy + 14} textAnchor="middle" fill="currentColor" fillOpacity="0.7" fontSize="12" fontFamily="var(--font-mono)">
                  {s.pointsLevel} PTS
                </text>
              )}
            </g>
          );
        })}
        {drawn.length === 0 && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fill="currentColor" fillOpacity="0.6" fontSize="16" fontFamily="var(--font-mono)">
            NO AUSPEX DATA
          </text>
        )}
      </svg>
      <figcaption className="mt-2 text-[11px] uppercase tracking-[0.25em] opacity-70">+++ Auspex · {title} +++</figcaption>
    </figure>
  );
}
