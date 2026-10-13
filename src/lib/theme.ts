/**
 * Per-star-system visual themes. A theme is a preset plus optional colour
 * overrides; it resolves to CSS custom properties that re-skin everything
 * inside the system's pages (Tailwind colour utilities read these variables).
 *
 * Client-safe: no server imports, so the admin preview can use it too.
 */

export const PRESETS = {
  imperial: { label: "Imperial (default)", colors: {} },
  blood: {
    label: "Blood & Brass: war-torn, Khornate",
    colors: { accent: "#b0170f", metal: "#8a5a2b", text: "#d9c6a6", terminal: "#d4a24a", atmosphere: "#3a0505" },
  },
  frost: {
    label: "Frost: ice worlds, bitter void",
    colors: { accent: "#5f8fa8", metal: "#9fb3bf", text: "#dfe6ea", terminal: "#8fd0e0", atmosphere: "#0d1a24" },
  },
  toxic: {
    label: "Toxic: death worlds, plague",
    colors: { accent: "#6b8a1f", metal: "#7d7a3a", text: "#cfcfa6", terminal: "#b8d14a", atmosphere: "#141a06" },
  },
  warp: {
    label: "Warp-touched: sorcery, madness",
    colors: { accent: "#7a2fa8", metal: "#4f9aa8", text: "#d8cfe6", terminal: "#c58cf0", atmosphere: "#160a24" },
  },
  forge: {
    label: "Forge: Mechanicus, molten",
    colors: { accent: "#c2410c", metal: "#a16207", text: "#e2cfae", terminal: "#f59e0b", atmosphere: "#2a1206" },
  },
  abyss: {
    label: "Abyss: oceans, the deep",
    colors: { accent: "#2f6f8f", metal: "#6f8f9f", text: "#cfdadf", terminal: "#7fd4d4", atmosphere: "#04121c" },
  },
  ash: {
    label: "Ash: dead worlds, ruin",
    colors: { accent: "#6b6b6b", metal: "#8a8070", text: "#c8c2b4", terminal: "#b5b5a0", atmosphere: "#121110" },
  },
} as const satisfies Record<string, { label: string; colors: Partial<Record<ColorKey, string>> }>;

export type PresetKey = keyof typeof PRESETS;
export const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

export const COLOR_KEYS = ["accent", "metal", "text", "terminal", "atmosphere"] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const COLOR_LABELS: Record<ColorKey, string> = {
  accent: "Accent: blood, rubrics, bullets, splatter",
  metal: "Metal: borders, frames, ornament",
  text: "Text: titles and body",
  terminal: "Cogitator: terminal readouts",
  atmosphere: "Atmosphere: background wash",
};

export type SystemTheme = {
  preset: PresetKey;
  colors: Partial<Record<ColorKey, string>>;
  /** 0–100: how strongly the atmosphere colour washes the page. */
  atmosphereStrength: number;
  /** 0–100: opacity of the backdrop image. */
  backdropOpacity: number;
};

export const DEFAULT_THEME: SystemTheme = { preset: "imperial", colors: {}, atmosphereStrength: 45, backdropOpacity: 30 };

export const HEX = /^#[0-9a-f]{6}$/i;

/** Accepts whatever is stored in the DB and returns a safe, complete theme. */
export function normalizeTheme(raw: unknown): SystemTheme {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_THEME };
  const r = raw as Record<string, unknown>;
  const preset = typeof r.preset === "string" && r.preset in PRESETS ? (r.preset as PresetKey) : "imperial";
  const colors: SystemTheme["colors"] = {};
  if (r.colors && typeof r.colors === "object") {
    for (const k of COLOR_KEYS) {
      const v = (r.colors as Record<string, unknown>)[k];
      if (typeof v === "string" && HEX.test(v)) colors[k] = v.toLowerCase();
    }
  }
  const pct = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : d);
  return {
    preset,
    colors,
    atmosphereStrength: pct(r.atmosphereStrength, DEFAULT_THEME.atmosphereStrength),
    backdropOpacity: pct(r.backdropOpacity, DEFAULT_THEME.backdropOpacity),
  };
}

/** Preset colours with explicit overrides applied on top. */
export function effectiveColors(theme: SystemTheme): Partial<Record<ColorKey, string>> {
  return { ...PRESETS[theme.preset].colors, ...theme.colors };
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix a colour toward black (amount < 0) or white (amount > 0). */
export function shade(hex: string, amount: number): string {
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  const out = hexToRgb(hex).map((c) => Math.round(c + (target - c) * t));
  return `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** CSS custom properties to set on the system's page wrapper. */
export function themeVars(theme: SystemTheme): Record<string, string> {
  const c = effectiveColors(theme);
  const vars: Record<string, string> = {};
  if (c.accent) {
    vars["--color-blood-bright"] = c.accent;
    vars["--color-blood"] = shade(c.accent, -0.45);
  }
  if (c.metal) {
    vars["--color-gold"] = c.metal;
    vars["--color-gold-bright"] = shade(c.metal, 0.25);
    vars["--color-line"] = shade(c.metal, -0.5);
    vars["--color-rust"] = shade(c.metal, -0.15);
  }
  if (c.text) {
    vars["--color-parchment"] = c.text;
    vars["--color-vellum"] = shade(c.text, -0.15);
    vars["--color-ash"] = shade(c.text, -0.45);
  }
  if (c.terminal) vars["--color-phosphor"] = c.terminal;
  return vars;
}

/** Background wash for the atmosphere colour, or null when none is set. */
export function atmosphereBackground(theme: SystemTheme): string | null {
  const color = effectiveColors(theme).atmosphere;
  if (!color || theme.atmosphereStrength === 0) return null;
  const a = theme.atmosphereStrength / 100;
  return [
    `radial-gradient(ellipse 70% 55% at 50% 0%, ${rgba(color, Math.min(1, a * 1.2))}, transparent 75%)`,
    `radial-gradient(ellipse 90% 60% at 50% 110%, ${rgba(color, a)}, transparent 70%)`,
    `linear-gradient(${rgba(color, a * 0.5)}, ${rgba(color, a * 0.5)})`,
  ].join(", ");
}
