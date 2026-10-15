import { gaussian, rng } from "./random";

/**
 * Procedural barred-spiral Milky Way, in scene units (1 unit = 1,000 ly).
 * Deterministic for a given seed. Returns flat arrays ready for a GPU buffer.
 */

export type GalaxyOptions = { seed?: number; count?: number; radius?: number };
export type GalaxyCloud = { positions: Float32Array; colors: Float32Array; sizes: Float32Array; count: number };

const ARMS = [
  { offset: 0, weight: 1 },
  { offset: Math.PI, weight: 1 },
  { offset: Math.PI / 2, weight: 0.55 },
  { offset: (3 * Math.PI) / 2, weight: 0.55 },
];
const PITCH = (13 * Math.PI) / 180;
const BAR_ANGLE = (28 * Math.PI) / 180;

// Colours (linear-ish RGB 0–1)
const CORE: [number, number, number] = [1.0, 0.86, 0.66];
const ARM: [number, number, number] = [0.72, 0.84, 1.0];
const NEBULA: [number, number, number] = [1.0, 0.55, 0.7];
const FIELD: [number, number, number] = [0.85, 0.82, 0.78];

export function generateGalaxy({ seed = 41, count = 80_000, radius = 50 }: GalaxyOptions = {}): GalaxyCloud {
  const rand = rng(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const armTotal = ARMS.reduce((s, a) => s + a.weight, 0);

  for (let i = 0; i < count; i++) {
    const roll = rand();
    let x: number, y: number, z: number;
    let c: [number, number, number];
    let size = 0.6 + rand() * 0.8;

    if (roll < 0.12) {
      // Bulge: dense, flattened, warm
      const r = Math.abs(gaussian(rand)) * radius * 0.07;
      const a = rand() * Math.PI * 2;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      y = gaussian(rand) * radius * 0.03 * Math.exp(-r / (radius * 0.1));
      c = CORE;
      size += 0.4;
    } else if (roll < 0.2) {
      // Central bar
      const along = gaussian(rand) * radius * 0.11;
      const across = gaussian(rand) * radius * 0.025;
      x = Math.cos(BAR_ANGLE) * along - Math.sin(BAR_ANGLE) * across;
      z = Math.sin(BAR_ANGLE) * along + Math.cos(BAR_ANGLE) * across;
      y = gaussian(rand) * radius * 0.012;
      c = CORE;
    } else if (roll < 0.94) {
      // Logarithmic spiral arms, starting from the bar's ends
      let pick = rand() * armTotal;
      const arm = ARMS.find((a) => (pick -= a.weight) < 0) ?? ARMS[0];
      const t = Math.pow(rand(), 0.8);
      const r = radius * (0.12 + 0.86 * t);
      const theta = arm.offset + BAR_ANGLE + Math.log(r / (radius * 0.12)) / Math.tan(PITCH);
      const spread = radius * (0.012 + 0.034 * t);
      x = Math.cos(theta) * r + gaussian(rand) * spread;
      z = Math.sin(theta) * r + gaussian(rand) * spread;
      y = gaussian(rand) * radius * 0.012 * (1 - 0.6 * t);
      const nebula = rand() < 0.035;
      c = nebula ? NEBULA : mix(CORE, ARM, Math.min(1, t * 1.6));
      if (nebula) size += 0.8;
      size += 0.35;
    } else {
      // Diffuse disk field
      const r = Math.sqrt(rand()) * radius;
      const a = rand() * Math.PI * 2;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      y = gaussian(rand) * radius * 0.015;
      c = FIELD;
      size *= 0.7;
    }

    // Slight brightness variation; fade the outskirts.
    const dist = Math.hypot(x, z);
    const fade = Math.max(0.25, 1 - Math.pow(dist / (radius * 1.05), 3));
    const jitter = 0.75 + rand() * 0.25;
    positions.set([x, y, z], i * 3);
    colors.set([c[0] * fade * jitter, c[1] * fade * jitter, c[2] * fade * jitter], i * 3);
    sizes[i] = size;
  }
  return { positions, colors, sizes, count };
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
