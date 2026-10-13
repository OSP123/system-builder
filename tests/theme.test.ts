import { describe, expect, it } from "vitest";
import {
  atmosphereBackground,
  DEFAULT_THEME,
  effectiveColors,
  normalizeTheme,
  PRESETS,
  shade,
  themeVars,
} from "@/lib/theme";
import { systemSchema } from "@/lib/validation";

describe("normalizeTheme", () => {
  it("falls back to the default for missing or junk data", () => {
    expect(normalizeTheme(null)).toEqual(DEFAULT_THEME);
    expect(normalizeTheme("nope")).toEqual(DEFAULT_THEME);
    expect(normalizeTheme({ preset: "not-a-preset" }).preset).toBe("imperial");
  });

  it("drops invalid colours and clamps percentages", () => {
    const t = normalizeTheme({
      preset: "frost",
      colors: { accent: "#ABCDEF", metal: "red", text: "javascript:alert(1)" },
      atmosphereStrength: 500,
      backdropOpacity: -3,
    });
    expect(t.colors).toEqual({ accent: "#abcdef" });
    expect(t.atmosphereStrength).toBe(100);
    expect(t.backdropOpacity).toBe(0);
  });
});

describe("themeVars", () => {
  it("the imperial preset with no overrides changes nothing", () => {
    expect(themeVars(DEFAULT_THEME)).toEqual({});
    expect(atmosphereBackground(DEFAULT_THEME)).toBeNull();
  });

  it("applies a preset's colours", () => {
    const vars = themeVars(normalizeTheme({ preset: "toxic" }));
    expect(vars["--color-blood-bright"]).toBe(PRESETS.toxic.colors.accent);
    expect(vars["--color-phosphor"]).toBe(PRESETS.toxic.colors.terminal);
  });

  it("explicit colours override the preset", () => {
    const t = normalizeTheme({ preset: "toxic", colors: { accent: "#123456" } });
    expect(effectiveColors(t).accent).toBe("#123456");
    expect(themeVars(t)["--color-blood-bright"]).toBe("#123456");
    expect(themeVars(t)["--color-gold"]).toBe(PRESETS.toxic.colors.metal);
  });

  it("atmosphere strength 0 disables the wash", () => {
    expect(atmosphereBackground(normalizeTheme({ preset: "warp", atmosphereStrength: 0 }))).toBeNull();
    expect(atmosphereBackground(normalizeTheme({ preset: "warp" }))).toContain("rgba(22, 10, 36");
  });
});

describe("shade", () => {
  it("mixes toward black and white", () => {
    expect(shade("#808080", -1)).toBe("#000000");
    expect(shade("#808080", 1)).toBe("#ffffff");
    expect(shade("#808080", 0)).toBe("#808080");
  });
});

describe("systemSchema theme fields", () => {
  it("builds a theme from form fields", () => {
    const r = systemSchema.parse({
      name: "Azure",
      themePreset: "forge",
      themeAccent: "#AA0000",
      themeMetal: "",
      themeAtmosphereStrength: "60",
      themeBackdropOpacity: "20",
      backdropImageId: "",
    });
    expect(r.theme).toEqual({ preset: "forge", colors: { accent: "#aa0000" }, atmosphereStrength: 60, backdropOpacity: 20 });
    expect(r.backdropImageId).toBeNull();
  });

  it("rejects malformed colours", () => {
    const r = systemSchema.safeParse({ name: "Azure", themeAccent: "red" });
    expect(r.success).toBe(false);
  });

  it("defaults to the imperial theme when no theme fields are sent", () => {
    expect(systemSchema.parse({ name: "Azure" }).theme).toEqual(DEFAULT_THEME);
  });
});
