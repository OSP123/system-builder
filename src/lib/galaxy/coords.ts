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

/**
 * Holy Terra, in light-years. The galactic core lies within Ultima Segmentum,
 * to the galactic east of Sol, so Terra sits west (and a little south) of it.
 */
export const TERRA: PlanePoint = { x: -18_000, z: 5_000 };

/**
 * Segmentum Solar is the region within this distance of Terra. Kept small enough
 * that the core (and the Maelstrom, between Solar's border and the core) lie in Ultima.
 */
export const SOLAR_RADIUS_LY = 12_000;

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
  Solar: { x: -18_000, z: 13_000 },
  Obscurus: { x: -8_000, z: -26_000 },
  Ultima: { x: 14_000, z: 14_000 },
  Tempestus: { x: -26_000, z: 34_000 },
  Pacificus: { x: -38_000, z: 20_000 },
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

/**
 * Lore anchors (approximate):
 * - Eye of Terror: galactic edge, north and west of Terra, Segmentum Obscurus.
 * - Cadia: guards the Cadian Gate beside the Eye.
 * - Maelstrom: Ultima Segmentum, between Segmentum Solar's border and the core.
 * - Baal: Red Scar, Ultima Segmentum, beyond the Great Rift (Imperium Nihilus).
 * - Ultramar: Eastern Fringe, south-east, on Terra's side of the Rift (Imperium Sanctus).
 * - Ghoul Stars: extreme galactic north-east.
 * - Hadex Anomaly: Eastern Fringe, the Great Rift's eastern end.
 */
export const LANDMARKS: Landmark[] = [
  { id: "terra", name: "Holy Terra", ...TERRA, kind: "terra", note: "Throneworld of the Imperium" },
  { id: "core", name: "Galactic Core", x: 0, z: 0, kind: "region", note: "The galaxy's heart, within Ultima Segmentum" },
  { id: "eye", name: "Eye of Terror", x: -30_000, z: -34_000, kind: "warp", note: "Warp storm where the Aeldari empire fell" },
  { id: "cadia", name: "Cadia", x: -31_000, z: -24_000, kind: "world", note: "Fortress world at the Cadian Gate" },
  { id: "maelstrom", name: "The Maelstrom", x: -3_500, z: 1_500, kind: "warp", note: "Warp rift between Segmentum Solar and the core" },
  { id: "baal", name: "Baal", x: 22_000, z: -16_000, kind: "world", note: "Red Scar, Ultima Segmentum" },
  { id: "ultramar", name: "Ultramar", x: 34_000, z: 22_000, kind: "world", note: "Realm of five hundred worlds, Eastern Fringe" },
  { id: "ghoul", name: "Ghoul Stars", x: 30_000, z: -36_000, kind: "region", note: "Uncharted stars at the galaxy's north-eastern rim" },
  { id: "hadex", name: "Hadex Anomaly", x: 46_000, z: 6_000, kind: "warp", note: "Eastern end of the Great Rift" },
];

/**
 * The Great Rift (Cicatrix Maledictum): from the Eye of Terror in the galactic
 * north-west, north of Terra, across to the Hadex Anomaly in the east. Ordered
 * west to east (x strictly increasing) so sideOfRift can interpolate.
 */
export const GREAT_RIFT_PATH: PlanePoint[] = [
  { x: -30_000, z: -34_000 },
  { x: -24_000, z: -22_000 },
  { x: -14_000, z: -12_000 },
  { x: -2_000, z: -9_000 },
  { x: 14_000, z: -6_000 },
  { x: 30_000, z: 0 },
  { x: 46_000, z: 6_000 },
];

export type RiftSide = "Imperium Sanctus" | "Imperium Nihilus";

/**
 * Which half of the Imperium a point falls in once the Rift opens: Imperium
 * Sanctus (Terra's side, to the south) or Imperium Nihilus (north). Beyond the
 * Rift's ends, its nearest end decides.
 */
export function sideOfRift(x: number, z: number): RiftSide {
  const path = GREAT_RIFT_PATH;
  let riftZ: number;
  if (x <= path[0].x) riftZ = path[0].z;
  else if (x >= path[path.length - 1].x) riftZ = path[path.length - 1].z;
  else {
    const i = path.findIndex((p) => p.x >= x);
    const a = path[i - 1];
    const b = path[i];
    riftZ = a.z + ((x - a.x) / (b.x - a.x)) * (b.z - a.z);
  }
  return z > riftZ ? "Imperium Sanctus" : "Imperium Nihilus";
}

/** Reach of the Astronomican, centred on Terra. */
export const ASTRONOMICAN_RADIUS_LY = 50_000;
