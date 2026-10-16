"use client";

import { useState } from "react";
import { TacticalMap } from "@/components/regions/TacticalMap";
import { sectorSchema, TACTICAL_MAP, type Sector } from "@/lib/regions";

type Row = { name: string; pointsLevel: string; shape: string; cx: string; cy: string };

const toRow = (s: Sector): Row => ({
  name: s.name,
  pointsLevel: s.pointsLevel?.toString() ?? "",
  shape: s.shape ?? "",
  cx: s.cx?.toString() ?? "",
  cy: s.cy?.toString() ?? "",
});

function toSector(r: Row): Sector {
  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
  return {
    name: r.name.trim(),
    pointsLevel: num(r.pointsLevel),
    shape: r.shape.trim() || undefined,
    cx: num(r.cx),
    cy: num(r.cy),
  };
}

/**
 * Sectors of a region, each optionally with a polygon on the 800x500 tactical
 * map. Posts JSON through a hidden field and previews the map as you type.
 */
export function SectorsEditor({ name, initial, title }: { name: string; initial: Sector[]; title: string }) {
  const [rows, setRows] = useState<Row[]>(initial.map(toRow));
  const sectors = rows.map(toSector);
  const valid = sectors.filter((s) => sectorSchema.safeParse(s).success);
  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={JSON.stringify(sectors)} />
      {rows.map((r, i) => {
        const problem = sectorSchema.safeParse(sectors[i]);
        return (
          <div key={i} className="space-y-2 border border-line bg-black/30 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[11px] text-ash">{i + 1}</span>
              <input aria-label="Sector name" placeholder="Sector name" value={r.name} onChange={(e) => update(i, { name: e.target.value })} className="field min-w-0 flex-1 py-1" />
              <input aria-label="Points level" placeholder="Points" inputMode="numeric" value={r.pointsLevel} onChange={(e) => update(i, { pointsLevel: e.target.value })} className="field w-24 py-1" />
              <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="tap text-xs text-red-400 hover:text-red-300">
                Remove
              </button>
            </div>
            <textarea
              aria-label={`${r.name || "Sector"} shape`}
              placeholder={`Optional map shape: x,y points in ${TACTICAL_MAP.width}x${TACTICAL_MAP.height}, e.g. 100,450 700,450 640,380 160,380`}
              rows={2}
              value={r.shape}
              onChange={(e) => update(i, { shape: e.target.value })}
              className="field font-mono text-xs"
            />
            {!problem.success && r.name.trim() && <p className="text-xs text-red-400">{problem.error.issues[0]?.message}</p>}
          </div>
        );
      })}
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setRows((rs) => [...rs, { name: "", pointsLevel: "", shape: "", cx: "", cy: "" }])}
      >
        + Sector
      </button>
      {valid.some((s) => s.shape) && <TacticalMap sectors={valid} title={title || "Preview"} />}
    </div>
  );
}
