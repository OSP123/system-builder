import { z } from "zod";

/**
 * Planet regions (e.g. theatres of war) and their sectors. Client-safe.
 * Sector shapes are SVG polygon points in an 800x500 tactical-map space.
 */

export const TACTICAL_MAP = { width: 800, height: 500 } as const;

const POLYGON = /^(\s*-?\d+(\.\d+)?,-?\d+(\.\d+)?\s*){3,}$/;

export const sectorSchema = z.object({
  name: z.string().trim().min(1, "Sector needs a name").max(80),
  pointsLevel: z.number().int().min(0).max(100_000).optional(),
  shape: z.string().trim().regex(POLYGON, "Shape must be at least three x,y points").optional(),
  cx: z.number().min(0).max(TACTICAL_MAP.width).optional(),
  cy: z.number().min(0).max(TACTICAL_MAP.height).optional(),
});
export type Sector = z.infer<typeof sectorSchema>;

/** Read sectors from the DB, dropping anything malformed rather than breaking a page. */
export function readSectors(raw: unknown): Sector[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x) => {
    const r = sectorSchema.safeParse(x);
    return r.success ? [r.data] : [];
  });
}

/** Parse "x,y x,y ..." into points. */
export function polygonPoints(shape: string): [number, number][] {
  return shape
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").map(Number) as [number, number]);
}

/** Centre of a polygon's bounding box, for labelling a sector without cx/cy. */
export function polygonCentre(shape: string): [number, number] {
  const pts = polygonPoints(shape);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

/**
 * Latitude/longitude (degrees) to a point on a sphere of `radius`, matching the
 * planet globe's orientation (+Y north, longitude 0 facing +Z, east toward +X).
 */
export function latLngToVector(lat: number, lng: number, radius = 1): [number, number, number] {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;
  return [radius * Math.cos(phi) * Math.sin(lambda), radius * Math.sin(phi), radius * Math.cos(phi) * Math.cos(lambda)];
}

export function formatLatLng(lat: number, lng: number): string {
  const ns = `${Math.abs(lat).toFixed(0)}°${lat >= 0 ? "N" : "S"}`;
  const ew = `${Math.abs(lng).toFixed(0)}°${lng >= 0 ? "E" : "W"}`;
  return `${ns} ${ew}`;
}

export type ControlShare = { faction: string; share: number };

/** A stored control snapshot, dropping anything malformed. */
export function readControl(value: unknown): ControlShare[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (c): c is ControlShare => !!c && typeof c.faction === "string" && typeof c.share === "number" && c.share > 0 && c.share <= 100,
  );
}
