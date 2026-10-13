/**
 * Procedural ink splatter: a ragged central blot, flung droplets and a few
 * streaks. Seeded so server and client render identically.
 */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blot(rand: () => number, cx: number, cy: number, r: number) {
  const n = 22;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.7 + rand() * 0.55);
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  });
  // Smooth closed curve through the midpoints.
  const mid = (i: number) => {
    const [x1, y1] = pts[i % n];
    const [x2, y2] = pts[(i + 1) % n];
    return [(x1 + x2) / 2, (y1 + y2) / 2];
  };
  let d = `M${mid(0).map((v) => v.toFixed(1)).join(" ")}`;
  for (let i = 1; i <= n; i++) {
    const [px, py] = pts[i % n];
    const [mx, my] = mid(i);
    d += ` Q${px.toFixed(1)} ${py.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  return d + "Z";
}

export function InkSplatter({ seed = 1, className }: { seed?: number; className?: string }) {
  const rand = rng(seed);
  const main = blot(rand, 100, 100, 34);
  const drops = Array.from({ length: 26 }, () => {
    const a = rand() * Math.PI * 2;
    const dist = 40 + Math.pow(rand(), 1.6) * 58;
    return { x: 100 + dist * Math.cos(a), y: 100 + dist * Math.sin(a), r: 0.8 + rand() * (dist < 60 ? 6 : 3) };
  });
  const streaks = Array.from({ length: 5 }, () => {
    const a = rand() * 360;
    return { a, len: 30 + rand() * 40, w: 1.5 + rand() * 2.5 };
  });
  return (
    <svg viewBox="0 0 200 200" className={className} fill="currentColor" aria-hidden>
      <path d={main} />
      <path d={blot(rand, 100 + (rand() - 0.5) * 30, 100 + (rand() - 0.5) * 30, 18)} />
      {streaks.map((s, i) => (
        <ellipse key={i} cx={100 + s.len} cy={100} rx={s.len * 0.55} ry={s.w} transform={`rotate(${s.a.toFixed(1)} 100 100)`} />
      ))}
      {drops.map((d, i) => (
        <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={d.r.toFixed(1)} />
      ))}
    </svg>
  );
}
