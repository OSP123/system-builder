import { hashString } from "./random";

/**
 * Planet appearance for the procedural globe. Presets come from the planet's
 * classification; Planet.genParams can override any field, e.g.
 *   { "seed": 42, "water": 0.9, "clouds": 0.3, "palette": { "deep": "#04121c" } }
 */

export type Palette = { deep: string; shallow: string; low: string; mid: string; high: string; peak: string };

export type PlanetLook = {
  seed: number;
  /** 0–1 share of the surface under water. */
  water: number;
  palette: Palette;
  /** 0–1 cloud cover. */
  clouds: number;
  cloudColor: string;
  atmosphere: string;
  /** 0–1 brightness of the atmosphere rim. */
  atmosphereStrength: number;
  /** 0–1 city lights on the night side (hives, forges). */
  lights: number;
  lightsColor: string;
  /** 0–1 glowing molten cracks (forge, daemon and volcanic worlds). */
  lava: number;
  /** 0–1 extent of polar ice. */
  ice: number;
  /** Terrain feature size; higher means more, smaller continents. */
  detail: number;
  /** Relative size in the system view. */
  size: number;
  /**
   * Optional equirectangular image wrapped around the globe instead of the
   * generated surface: a site path under /textures/ or an uploaded /media/ file.
   */
  texture?: string;
};

const BASE: Omit<PlanetLook, "seed"> = {
  water: 0.55,
  palette: { deep: "#0b2a4a", shallow: "#2f6f8f", low: "#4f6b3a", mid: "#6e6a45", high: "#7d6c55", peak: "#d8d2c4" },
  clouds: 0.45,
  cloudColor: "#e8e4dc",
  atmosphere: "#7fb0e0",
  atmosphereStrength: 0.6,
  lights: 0,
  lightsColor: "#ffb35c",
  lava: 0,
  ice: 0.3,
  detail: 1.6,
  size: 1,
};

type Preset = Partial<Omit<PlanetLook, "palette">> & { palette?: Partial<Palette> };

const PRESETS: [RegExp, Preset][] = [
  [/hive/i, { water: 0.18, palette: { low: "#4a463f", mid: "#5d574c", high: "#6f665a", peak: "#8a8378" }, clouds: 0.55, cloudColor: "#a89f8a", atmosphere: "#b8a27a", lights: 0.9, ice: 0.1, size: 1.1 }],
  [/forge/i, { water: 0.05, palette: { deep: "#1a0d08", shallow: "#2b1408", low: "#2e221b", mid: "#3d2a1f", high: "#4f3424", peak: "#6b4a33" }, clouds: 0.35, cloudColor: "#5a4a40", atmosphere: "#ff8a3c", atmosphereStrength: 0.8, lights: 0.7, lava: 0.7, ice: 0, size: 1.05 }],
  [/agri/i, { water: 0.45, palette: { low: "#5f8a32", mid: "#8a9a3a", high: "#a3955a" }, clouds: 0.4, ice: 0.15 }],
  [/death/i, { water: 0.35, palette: { low: "#1f3d1a", mid: "#2c4a1c", high: "#3d4a26", peak: "#5a5a3a" }, clouds: 0.6, cloudColor: "#c8d0b0", atmosphere: "#8fd46b", atmosphereStrength: 0.7, ice: 0.05 }],
  [/ocean|water/i, { water: 0.92, clouds: 0.4, ice: 0.25 }],
  [/ice|frozen|glacial/i, { water: 0.3, palette: { deep: "#1c3a52", shallow: "#6f9fbf", low: "#b8c8d0", mid: "#d0dce2", high: "#e6eef2", peak: "#ffffff" }, clouds: 0.3, atmosphere: "#cfe6ff", ice: 0.9 }],
  [/desert|arid|dust/i, { water: 0.04, palette: { low: "#b08850", mid: "#c49a5c", high: "#a87a48", peak: "#e0c8a0" }, clouds: 0.1, atmosphere: "#e0b080", ice: 0 }],
  [/daemon|warp/i, { water: 0.4, palette: { deep: "#2a0614", shallow: "#5c0d2a", low: "#4a1040", mid: "#6a1a5a", high: "#8a2a4a", peak: "#d04a6a" }, clouds: 0.5, cloudColor: "#c05a9a", atmosphere: "#c63aff", atmosphereStrength: 1, lava: 0.5, ice: 0 }],
  [/dead|tomb|barren/i, { water: 0, palette: { low: "#4a4642", mid: "#5a5650", high: "#6a655e", peak: "#8a857c" }, clouds: 0, atmosphereStrength: 0.15, ice: 0.1 }],
  [/shrine|cardinal/i, { palette: { low: "#6a6a3a", mid: "#8a7a4a", high: "#a08a5a", peak: "#e0d0a0" }, lights: 0.5, atmosphere: "#ffd88a" }],
  [/mining/i, { water: 0.1, palette: { low: "#5a4a3a", mid: "#6a5240", high: "#7a5a44", peak: "#9a8a7a" }, clouds: 0.2, lights: 0.3, lava: 0.15 }],
  [/fortress/i, { water: 0.25, palette: { low: "#4a4a44", mid: "#5a584e", high: "#6a6658" }, lights: 0.5, clouds: 0.35 }],
  [/feral|feudal|knight/i, { water: 0.5, palette: { low: "#4a6a2e", mid: "#6a7a3a", high: "#7a6a4a" }, clouds: 0.45 }],
  [/penal/i, { water: 0.15, palette: { low: "#4a3e36", mid: "#5a4a40", high: "#6a5a4c" }, clouds: 0.5, cloudColor: "#8a8078", lights: 0.25 }],
  [/gas giant/i, { water: 1, palette: { deep: "#8a6a4a", shallow: "#c0a070" }, clouds: 0.9, cloudColor: "#d8c0a0", atmosphere: "#f0d0a0", ice: 0, detail: 0.6, size: 2.2 }],
];

const HEX = /^#[0-9a-f]{6}$/i;
/** Only same-site images: bundled /textures/ files or uploaded /media/ files. */
export const TEXTURE_PATH = /^\/(textures|media)\/[A-Za-z0-9._-]+\.(jpe?g|png|webp|avif)$/;
const clamp01 = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);

/** Resolve the look for a planet: classification preset, then genParams overrides. */
export function planetLook(planetId: string, classification: string | null | undefined, genParams: unknown): PlanetLook {
  const preset = PRESETS.find(([re]) => re.test(classification ?? ""))?.[1] ?? {};
  const look: PlanetLook = {
    ...BASE,
    ...preset,
    palette: { ...BASE.palette, ...preset.palette },
    seed: hashString(planetId) % 100_000,
  };

  if (genParams && typeof genParams === "object" && !Array.isArray(genParams)) {
    const g = genParams as Record<string, unknown>;
    if (typeof g.seed === "number" && Number.isFinite(g.seed)) look.seed = Math.abs(Math.floor(g.seed)) % 100_000;
    for (const k of ["water", "clouds", "atmosphereStrength", "lights", "lava", "ice"] as const) look[k] = clamp01(g[k], look[k]);
    for (const k of ["cloudColor", "atmosphere", "lightsColor"] as const) {
      if (typeof g[k] === "string" && HEX.test(g[k] as string)) look[k] = g[k] as string;
    }
    if (typeof g.detail === "number" && g.detail > 0 && g.detail <= 8) look.detail = g.detail;
    if (typeof g.size === "number" && g.size > 0 && g.size <= 4) look.size = g.size;
    if (typeof g.texture === "string" && TEXTURE_PATH.test(g.texture)) look.texture = g.texture;
    if (g.palette && typeof g.palette === "object") {
      for (const [k, v] of Object.entries(g.palette as Record<string, unknown>)) {
        if (k in look.palette && typeof v === "string" && HEX.test(v)) look.palette[k as keyof Palette] = v;
      }
    }
  }
  return look;
}

/** The look for a map planet: its uploaded texture, if any, overrides genParams. */
export function mapPlanetLook(p: { id: string; classification: string | null; genParams: unknown; textureUrl: string | null }): PlanetLook {
  const look = planetLook(p.id, p.classification, p.genParams);
  return p.textureUrl && TEXTURE_PATH.test(p.textureUrl) ? { ...look, texture: p.textureUrl } : look;
}

/** Orbit radius in system-view units for the planet at `position` (0-based, innermost first). */
export function orbitRadius(position: number): number {
  return 4.5 + position * 2.8;
}

/** Orbital period in seconds of animation: inner planets move faster (Kepler-ish). */
export function orbitPeriod(radius: number): number {
  return 18 * Math.pow(radius / 4.5, 1.5);
}

/** Planets sorted innermost first; orbitIndex 0 ("unknown") goes last. */
export function sortByOrbit<T extends { orbitIndex: number; name: string }>(planets: T[]): T[] {
  return [...planets].sort((a, b) => (a.orbitIndex || 999) - (b.orbitIndex || 999) || a.name.localeCompare(b.name));
}
