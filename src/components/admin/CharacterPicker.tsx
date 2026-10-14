"use client";

import { useState } from "react";

type Option = { id: string; name: string; title: string | null };

/** Checkbox list of the world's characters; posts a comma-separated id list. */
export function CharacterPicker({ name, options, initial }: { name: string; options: Option[]; initial: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (options.length === 0) return <p className="text-sm text-ash">No characters yet. Create some under Characters.</p>;
  return (
    <div>
      <input type="hidden" name={name} value={Array.from(selected).join(",")} />
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 border border-line px-3 py-2 text-sm hover:border-rust">
            <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} className="accent-blood-bright" />
            <span>
              {o.name}
              {o.title && <span className="block text-xs text-ash">{o.title}</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
