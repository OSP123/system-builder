/** Data handed from the server to the map: published content only. */
export type MapPlanet = {
  id: string;
  slug: string;
  name: string;
  classification: string | null;
  orbitIndex: number;
  population: string | null;
  genParams: unknown;
  regions: MapRegion[];
};
export type MapRegion = { id: string; slug: string; name: string; kind: string | null; summary: string | null; lat: number; lng: number };
export type MapSystem = {
  id: string;
  slug: string;
  name: string;
  starType: string | null;
  segmentum: string | null;
  x: number;
  y: number;
  z: number;
  worldSlug: string;
  planets: MapPlanet[];
};
export type MapWorld = { id: string; slug: string; name: string; color: string };
export type GalaxyData = { worlds: MapWorld[]; systems: MapSystem[] };

export type MapView =
  | { level: "galaxy" }
  | { level: "system"; systemId: string }
  | { level: "planet"; systemId: string; planetId: string };

/** Read the view from URL parameters, ignoring ids that don't exist (or aren't published). */
export function parseView(params: { system?: string | null; planet?: string | null }, data: GalaxyData): MapView {
  const system = params.system ? data.systems.find((s) => s.id === params.system) : undefined;
  if (!system) return { level: "galaxy" };
  const planet = params.planet ? system.planets.find((p) => p.id === params.planet) : undefined;
  return planet ? { level: "planet", systemId: system.id, planetId: planet.id } : { level: "system", systemId: system.id };
}

/** URL query string for a view (plus an optional world filter). */
export function viewQuery(view: MapView, world?: string | null): string {
  const q = new URLSearchParams();
  if (world) q.set("world", world);
  if (view.level !== "galaxy") q.set("system", view.systemId);
  if (view.level === "planet") q.set("planet", view.planetId);
  const s = q.toString();
  return s ? `?${s}` : "";
}

const WORLD_COLORS = ["#d4af5a", "#8fbcd4", "#e0614f", "#a3b86c", "#c58cf0", "#f59e0b", "#7fd4d4", "#e7a0b8"];

/** Colour for the world at `index` in the (name-sorted) world list; distinct for the first eight. */
export function worldColor(index: number): string {
  return WORLD_COLORS[index % WORLD_COLORS.length];
}
