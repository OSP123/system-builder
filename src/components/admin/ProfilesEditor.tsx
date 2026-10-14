"use client";

import { useState } from "react";
import {
  emptyModelProfile,
  emptyVehicleProfile,
  MODEL_STATS,
  STAT_HEADERS,
  VEHICLE_STATS,
  type StatProfile,
} from "@/lib/codex";

type Props = {
  name: string;
  initial: StatProfile[];
  /** Character mode: at most one model profile, posted as a single object (or "" for none). */
  single?: boolean;
};

/** Edits statlines as a grid of small inputs; posts JSON through a hidden field. */
export function ProfilesEditor({ name, initial, single = false }: Props) {
  const [rows, setRows] = useState<StatProfile[]>(initial);
  const update = (i: number, key: string, value: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? ({ ...r, [key]: value } as StatProfile) : r)));
  const remove = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));

  const value = single ? (rows[0] ? JSON.stringify(rows[0]) : "") : JSON.stringify(rows);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={value} />
      {rows.length === 0 && <p className="text-sm text-ash">{single ? "No statline." : "No profiles yet."}</p>}
      {rows.map((r, i) => {
        const cols = r.kind === "model" ? MODEL_STATS : VEHICLE_STATS;
        return (
          <div key={i} className="border border-line bg-black/30 p-3">
            <div className="mb-2 flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ash">{r.kind === "model" ? "Model" : "Vehicle"}</span>
              <input
                aria-label="Profile name"
                placeholder={r.kind === "model" ? "e.g. Sergeant" : "e.g. Rhino"}
                value={r.name}
                onChange={(e) => update(i, "name", e.target.value)}
                className="field max-w-xs py-1"
              />
              <button type="button" onClick={() => remove(i)} className="ml-auto text-xs text-red-400 hover:text-red-300">
                Remove
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {cols.map((c) => (
                <label key={c} className="flex w-14 flex-col items-center text-[11px] font-bold uppercase text-ash">
                  {STAT_HEADERS[c]}
                  <input
                    aria-label={`${r.name || "Profile"} ${STAT_HEADERS[c]}`}
                    value={(r as Record<string, string>)[c]}
                    maxLength={5}
                    onChange={(e) => update(i, c, e.target.value)}
                    className="field mt-1 px-1 py-1 text-center font-mono text-sm text-parchment"
                  />
                </label>
              ))}
            </div>
          </div>
        );
      })}
      <div className="flex gap-2">
        {(!single || rows.length === 0) && (
          <button type="button" className="btn btn-ghost" onClick={() => setRows((rs) => [...rs, emptyModelProfile()])}>
            + {single ? "Add statline" : "Model profile"}
          </button>
        )}
        {!single && (
          <button type="button" className="btn btn-ghost" onClick={() => setRows((rs) => [...rs, emptyVehicleProfile()])}>
            + Vehicle profile
          </button>
        )}
      </div>
    </div>
  );
}
