"use client";

import Link from "next/link";
import { useState } from "react";
import { GALAXY_RADIUS_LY, SEGMENTUM_LABELS, segmentumAt, sideOfRift, TERRA } from "@/lib/galaxy/coords";
import { Field } from "./ActionForm";

const AXES = [
  { key: "x", label: "X (east +)" },
  { key: "y", label: "Y (above plane +)" },
  { key: "z", label: "Z (south +)" },
] as const;

/** Galactic coordinates with a live readout of where the position falls. */
export function CoordinateFields({ initial, systemId }: { initial: { x: number; y: number; z: number }; systemId?: string }) {
  const [pos, setPos] = useState({ x: String(initial.x), y: String(initial.y), z: String(initial.z) });
  const x = Number(pos.x) || 0;
  const z = Number(pos.z) || 0;
  const fromCore = Math.round(Math.hypot(x, z));
  const fromTerra = Math.round(Math.hypot(x - TERRA.x, z - TERRA.z));
  const beyondRim = fromCore > GALAXY_RADIUS_LY;

  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">Galactic position</legend>
      <p className="mb-3 text-xs text-ash">
        Light-years from the galactic core. Holy Terra sits at {TERRA.x.toLocaleString()}, 0, {TERRA.z.toLocaleString()} (west of the core); the galaxy is about 50,000 ly in radius. Map north is −Z.
      </p>
      <div className="grid grid-cols-3 gap-4">
        {AXES.map(({ key, label }) => (
          <Field key={key} name={key} label={label}>
            <input
              id={key}
              name={key}
              type="number"
              step="any"
              className="field"
              value={pos[key]}
              onChange={(e) => setPos((p) => ({ ...p, [key]: e.target.value }))}
            />
          </Field>
        ))}
      </div>
      <p className="cogitator mt-3 px-3 py-2 text-xs uppercase tracking-widest" aria-live="polite">
        {SEGMENTUM_LABELS[segmentumAt(x, z)]} · {sideOfRift(x, z)} · {fromCore.toLocaleString()} ly from the core · {fromTerra.toLocaleString()} ly from Terra
        {beyondRim && " · beyond the galactic rim"}
      </p>
      {systemId && (
        <Link href={`/galaxy?system=${systemId}`} target="_blank" className="tap mt-2 inline-block text-xs text-cerulean-bright hover:underline">
          Locate on the galaxy map ↗
        </Link>
      )}
    </fieldset>
  );
}
