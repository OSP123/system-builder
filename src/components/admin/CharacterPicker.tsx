"use client";

import { useState } from "react";

type Option = { id: string; name: string; title: string | null; playedBy?: string | null };

/** Checkbox list of the world's characters, searchable by name, title or commander; posts a comma-separated id list. */
export function CharacterPicker({ name, options, initial }: { name: string; options: Option[]; initial: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [query, setQuery] = useState("");
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (options.length === 0) return <p className="text-sm text-ash">No characters yet. Create some under Characters.</p>;
  const q = query.trim().toLowerCase();
  // Selected characters stay visible while searching, so they can be unticked.
  const shown = q
    ? options.filter((o) => selected.has(o.id) || [o.name, o.title, o.playedBy].some((v) => v?.toLowerCase().includes(q)))
    : options;
  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={Array.from(selected).join(",")} />
      {options.length > 8 && (
        <input
          type="search"
          aria-label="Search characters"
          placeholder="Search by name or commander"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          className="field"
        />
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {shown.map((o) => (
          <label key={o.id} className="flex items-center gap-2 border border-line px-3 py-2 text-sm hover:border-rust">
            <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} className="accent-blood-bright" />
            <span>
              {o.name}
              {(o.title || o.playedBy) && (
                <span className="block text-xs text-ash">{[o.title, o.playedBy && `commander: ${o.playedBy}`].filter(Boolean).join(" · ")}</span>
              )}
            </span>
          </label>
        ))}
        {shown.length === 0 && <p className="text-sm text-ash">No character matches “{query}”.</p>}
      </div>
    </div>
  );
}
