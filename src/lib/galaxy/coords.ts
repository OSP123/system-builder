/**
 * Galactic coordinates for the 41st millennium map.
 *
 * Stored coordinates (StarSystem.x/y/z) are in light-years from the galactic
 * core: +x is galactic east, +z is south, +y is above the galactic plane.
 * The map shows north (-z) at the top. Positions of Terra, the Segmenta and
 * landmarks are approximations after the Imperium's charts; every value lives
 * here so they can be adjusted in one place.
 */

export const GALAXY_RADIUS_LY = 50_000;
/** Scene units: 1 unit = 1,000 light-years. */
export const LY_PER_UNIT = 1_000;

export type Vec3 = [number, number, number];
export type PlanePoint = { x: number; z: number };

export const toScene = (x: number, y: number, z: number): Vec3 => [x / LY_PER_UNIT, y / LY_PER_UNIT, z / LY_PER_UNIT];

/** Holy Terra, in light-years. */
export const TERRA: PlanePoint = { x: 0, z: 26_000 };

/** Segmentum Solar is the region within this distance of Terra. */
export const SOLAR_RADIUS_LY = 16_000;

export type Segmentum = "Solar" | "Obscurus" | "Ultima" | "Tempestus" | "Pacificus";

/**
 * Outside Segmentum Solar, the galaxy is divided into wedges by bearing from
 * Terra (degrees clockwise from galactic north). Ultima is the vast eastern wedge.
 */
export const SEGMENTUM_WEDGES: { name: Exclude<Segmentum, "Solar">; from: number; to: number }[] = [
  { name: "Obscurus", from: 300, to: 30 },
  { name: "Ultima", from: 30, to: 150 },
  { name: "Tempestus", from: 150, to: 220 },
  { name: "Pacificus", from: 220, to: 300 },
];

/** Bearing in degrees clockwise from north (-z), 0–360. */
export function bearing(from: PlanePoint, to: PlanePoint): number {
  const deg = (Math.atan2(to.x - from.x, -(to.z - from.z)) * 180) / Math.PI;
  return (deg + 360) % 360;
}

function inArc(deg: number, from: number, to: number) {
  return from <= to ? deg >= from && deg < to : deg >= from || deg < to;
}

export function segmentumAt(x: number, z: number): Segmentum {
  const dx = x - TERRA.x;
  const dz = z - TERRA.z;
  if (Math.hypot(dx, dz) <= SOLAR_RADIUS_LY) return "Solar";
  const b = bearing(TERRA, { x, z });
  return SEGMENTUM_WEDGES.find((w) => inArc(b, w.from, w.to))?.name ?? "Ultima";
}

export const SEGMENTUM_LABELS: Record<Segmentum, string> = {
  Solar: "Segmentum Solar",
  Obscurus: "Segmentum Obscurus",
  Ultima: "Ultima Segmentum",
  Tempestus: "Segmentum Tempestus",
  Pacificus: "Segmentum Pacificus",
};

/** Where to print each Segmentum's name on the map (light-years). */
export const SEGMENTUM_LABEL_POSITIONS: Record<Segmentum, PlanePoint> = {
  Solar: { x: 0, z: 37_000 },
  Obscurus: { x: -6_000, z: -24_000 },
  Ultima: { x: 24_000, z: -12_000 },
  Tempestus: { x: 12_000, z: 47_000 },
  Pacificus: { x: -30_000, z: 22_000 },
};

/** Point where a wedge boundary leaves the Solar ring, and where it meets the galaxy's edge. */
export function wedgeBoundaryLine(bearingDeg: number): [PlanePoint, PlanePoint] {
  const rad = (bearingDeg * Math.PI) / 180;
  const dir = { x: Math.sin(rad), z: -Math.cos(rad) };
  const start = { x: TERRA.x + dir.x * SOLAR_RADIUS_LY, z: TERRA.z + dir.z * SOLAR_RADIUS_LY };
  // Walk outward until past the galaxy's rim.
  let t = SOLAR_RADIUS_LY;
  while (Math.hypot(TERRA.x + dir.x * t, TERRA.z + dir.z * t) < GALAXY_RADIUS_LY && t < 200_000) t += 500;
  return [start, { x: TERRA.x + dir.x * t, z: TERRA.z + dir.z * t }];
}

export type Landmark = { id: string; name: string; x: number; z: number; kind: "terra" | "warp" | "world" | "region"; note: string };

export const LANDMARKS: Landmark[] = [
  { id: "terra", name: "Holy Terra", ...TERRA, kind: "terra", note: "Throneworld of the Imperium" },
  { id: "core", name: "Galactic Core", x: 0, z: 0, kind: "region", note: "The dense heart of the galaxy" },
  { id: "eye", name: "Eye of Terror", x: -24_000, z: -10_000, kind: "warp", note: "Warp storm where the Aeldari empire fell" },
  { id: "maelstrom", name: "The Maelstrom", x: 9_000, z: 12_000, kind: "warp", note: "Warp rift near the Segmentum Solar" },
  { id: "ultramar", name: "Ultramar", x: 36_000, z: 6_000, kind: "world", note: "Realm of five hundred worlds" },
  { id: "baal", name: "Baal", x: 30_000, z: 28_000, kind: "world", note: "Red Scar, eastern Ultima" },
  { id: "ghoul", name: "Ghoul Stars", x: 46_000, z: -6_000, kind: "region", note: "Uncharted stars at the galaxy's eastern rim" },
];

/** The Great Rift (Cicatrix Maledictum), as a path across the galaxy in light-years. */
export const GREAT_RIFT_PATH: PlanePoint[] = [
  { x: -24_000, z: -10_000 },
  { x: -14_000, z: -1_000 },
  { x: -3_000, z: 7_000 },
  { x: 10_000, z: 11_000 },
  { x: 24_000, z: 9_000 },
  { x: 38_000, z: 2_000 },
  { x: 47_000, z: -2_000 },
];

/** Reach of the Astronomican, centred on Terra. */
export const ASTRONOMICAN_RADIUS_LY = 50_000;
