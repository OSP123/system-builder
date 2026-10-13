"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { mediaUrl, useMediaLibrary, type MediaItem } from "./MediaLibrary";
import { UploadButton } from "./UploadButton";

/** Markdown textarea with live preview and one-click image insertion from the world's library. */
export function MarkdownEditor({ name, defaultValue, rows = 18 }: { name: string; defaultValue?: string | null; rows?: number }) {
  const { items } = useMediaLibrary();
  const [value, setValue] = useState(defaultValue ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [showImages, setShowImages] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  function insertImage(m: MediaItem) {
    const snippet = `\n![${m.alt ?? ""}](${mediaUrl(m.key)})\n`;
    const el = textarea.current;
    const at = el ? el.selectionStart : value.length;
    setValue(value.slice(0, at) + snippet + value.slice(at));
    setShowImages(false);
    setTab("write");
  }

  const tabClass = (t: string) =>
    `px-3 py-1.5 text-sm rounded-t-md ${tab === t ? "bg-void text-parchment border border-b-0 border-line" : "text-ash hover:text-parchment"}`;

  return (
    <div>
      <div className="flex items-end justify-between">
        <div className="flex gap-1">
          <button type="button" className={tabClass("write")} onClick={() => setTab("write")}>Write</button>
          <button type="button" className={tabClass("preview")} onClick={() => setTab("preview")}>Preview</button>
        </div>
        <button type="button" className="mb-1 text-xs text-cerulean-bright hover:underline" onClick={() => setShowImages((s) => !s)}>
          {showImages ? "Close images" : "Insert image"}
        </button>
      </div>

      {showImages && (
        <div className="mb-2 rounded-md border border-line bg-void p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-ash">Click an image to insert it at the cursor.</span>
            <UploadButton label="Upload" onUploaded={insertImage} />
          </div>
          <div className="grid max-h-56 grid-cols-5 gap-2 overflow-y-auto sm:grid-cols-8">
            {items.map((m) => (
              <button key={m.id} type="button" onClick={() => insertImage(m)} className="aspect-square overflow-hidden rounded border border-line hover:border-cerulean">
                <img src={mediaUrl(m.key)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keep the textarea mounted so its value always submits with the form. */}
      <textarea
        ref={textarea}
        id={name}
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`field font-mono text-sm leading-relaxed ${tab === "write" ? "" : "hidden"}`}
        placeholder="Write in Markdown: # Heading, **bold**, > quote, - list…"
      />
      {tab === "preview" && (
        <div className="min-h-64 rounded-md border border-line bg-void p-6">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-ash">Nothing to preview.</p>}
        </div>
      )}
    </div>
  );
}
