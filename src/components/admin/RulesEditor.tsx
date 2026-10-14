"use client";

import { useState } from "react";
import type { SpecialRule } from "@/lib/codex";

/** Repeatable special rules (name + description); posts JSON through a hidden field. */
export function RulesEditor({ name, initial }: { name: string; initial: SpecialRule[] }) {
  const [rules, setRules] = useState<SpecialRule[]>(initial);
  const update = (i: number, patch: Partial<SpecialRule>) => setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(rules)} />
      {rules.map((r, i) => (
        <div key={i} className="space-y-2 border border-line bg-black/30 p-3">
          <div className="flex gap-3">
            <input
              aria-label="Rule name"
              placeholder="Rule name, e.g. Fearless"
              value={r.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="field py-1"
            />
            <button type="button" onClick={() => setRules((rs) => rs.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-300">
              Remove
            </button>
          </div>
          <textarea
            aria-label="Rule description"
            placeholder="What the rule does"
            rows={2}
            value={r.description}
            onChange={(e) => update(i, { description: e.target.value })}
            className="field text-sm"
          />
        </div>
      ))}
      <button type="button" className="btn btn-ghost" onClick={() => setRules((rs) => [...rs, { name: "", description: "" }])}>
        + Special rule
      </button>
    </div>
  );
}
