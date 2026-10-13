"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { mediaUrl, useMediaLibrary } from "./MediaLibrary";
import { UploadButton } from "./UploadButton";

/** Choose a cover image from the world's library (or upload one). Submits as a hidden input. */
export function ImagePicker({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const { items } = useMediaLibrary();
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const selected = items.find((m) => m.id === value);

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-36 items-center justify-center overflow-hidden rounded-md border border-line bg-void">
          {selected ? (
            <img src={mediaUrl(selected.key)} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-ash">No image</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setOpen((o) => !o)}>
            {open ? "Close library" : "Choose from library"}
          </button>
          <UploadButton label="Upload new" onUploaded={(m) => setValue(m.id)} />
          {value && (
            <button type="button" className="btn btn-ghost" onClick={() => setValue("")}>
              Remove
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="mt-3 grid max-h-72 grid-cols-4 gap-2 overflow-y-auto rounded-md border border-line bg-void p-2 sm:grid-cols-6">
          {items.length === 0 && <p className="col-span-full p-4 text-sm text-ash">The library is empty. Upload an image first.</p>}
          {items.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => {
                setValue(m.id);
                setOpen(false);
              }}
              className={`aspect-square overflow-hidden rounded border-2 ${m.id === value ? "border-gold" : "border-transparent hover:border-cerulean"}`}
              title={m.alt ?? m.originalName}
            >
              <img src={mediaUrl(m.key)} alt={m.alt ?? ""} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
