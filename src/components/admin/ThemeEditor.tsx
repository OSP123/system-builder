"use client";

import { useState } from "react";
import {
  atmosphereBackground,
  COLOR_KEYS,
  COLOR_LABELS,
  effectiveColors,
  PRESET_KEYS,
  PRESETS,
  themeVars,
  type ColorKey,
  type PresetKey,
  type SystemTheme,
} from "@/lib/theme";
import { Field } from "./ActionForm";

/** Preset picker, colour overrides and sliders, with a live preview of the result. */
export function ThemeEditor({ initial, systemName }: { initial: SystemTheme; systemName?: string }) {
  const [theme, setTheme] = useState<SystemTheme>(initial);
  const effective = effectiveColors(theme);

  const setColor = (k: ColorKey, v: string | undefined) =>
    setTheme((t) => {
      const colors = { ...t.colors };
      if (v) colors[k] = v;
      else delete colors[k];
      return { ...t, colors };
    });

  const fieldName = (k: ColorKey) => `theme${k[0].toUpperCase()}${k.slice(1)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <Field name="themePreset" label="Preset">
          <select
            id="themePreset"
            name="themePreset"
            className="field"
            value={theme.preset}
            onChange={(e) => setTheme((t) => ({ ...t, preset: e.target.value as PresetKey }))}
          >
            {PRESET_KEYS.map((k) => (
              <option key={k} value={k}>{PRESETS[k].label}</option>
            ))}
          </select>
        </Field>

        <div className="space-y-3">
          {COLOR_KEYS.map((k) => {
            const custom = theme.colors[k] !== undefined;
            const shown = effective[k] ?? "#000000";
            return (
              <Field key={k} name={fieldName(k)} label={COLOR_LABELS[k]}>
                <div className="flex items-center gap-3">
                  <input type="hidden" name={fieldName(k)} value={theme.colors[k] ?? ""} />
                  <input
                    type="color"
                    aria-label={`${k} colour`}
                    value={shown}
                    disabled={!custom}
                    onChange={(e) => setColor(k, e.target.value)}
                    className="h-9 w-14 cursor-pointer border border-line bg-transparent disabled:cursor-not-allowed disabled:opacity-40"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={custom}
                      onChange={(e) => setColor(k, e.target.checked ? shown : undefined)}
                      className="accent-blood-bright"
                    />
                    Custom
                  </label>
                  <span className="font-mono text-xs text-ash">
                    {custom ? shown : effective[k] ? `${effective[k]} (preset)` : "default"}
                  </span>
                </div>
              </Field>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="themeAtmosphereStrength" label={`Atmosphere strength: ${theme.atmosphereStrength}%`}>
            <input
              id="themeAtmosphereStrength"
              name="themeAtmosphereStrength"
              type="range"
              min={0}
              max={100}
              value={theme.atmosphereStrength}
              onChange={(e) => setTheme((t) => ({ ...t, atmosphereStrength: Number(e.target.value) }))}
              className="w-full accent-blood-bright"
            />
          </Field>
          <Field name="themeBackdropOpacity" label={`Backdrop image opacity: ${theme.backdropOpacity}%`}>
            <input
              id="themeBackdropOpacity"
              name="themeBackdropOpacity"
              type="range"
              min={0}
              max={100}
              value={theme.backdropOpacity}
              onChange={(e) => setTheme((t) => ({ ...t, backdropOpacity: Number(e.target.value) }))}
              className="w-full accent-blood-bright"
            />
          </Field>
        </div>
      </div>

      <ThemePreview theme={theme} name={systemName || "System"} />
    </div>
  );
}

function ThemePreview({ theme, name }: { theme: SystemTheme; name: string }) {
  const wash = atmosphereBackground(theme);
  return (
    <div
      aria-label="Theme preview"
      className="relative overflow-hidden border border-line bg-void p-5"
      style={themeVars(theme) as React.CSSProperties}
    >
      {wash && <div className="absolute inset-0" style={{ background: wash }} aria-hidden />}
      <div className="relative">
        <p className="rubric">Preview</p>
        <p className="gothic-title mt-2 text-4xl">{name}</p>
        <p className="mt-2 font-serif italic text-vellum">A world kept in silence while the galaxy burned.</p>
        <div className="ink-rule my-4" />
        <p className="font-serif text-parchment">
          <span className="mr-2 text-blood-bright">✠</span>Records of the system, rendered in its colours.
        </p>
        <div className="gothic-frame mt-4 p-3">
          <p className="font-gothic text-xl font-bold text-parchment">Linked Record</p>
          <p className="font-serif text-sm italic text-ash">Summary text in the muted tone.</p>
        </div>
        <div className="cogitator mt-4 p-3 text-xs uppercase tracking-widest">
          +++ Imperial record +++
          <br />
          <span className="cursor-blink">Awaiting query</span>
        </div>
      </div>
    </div>
  );
}
