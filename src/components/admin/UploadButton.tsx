"use client";

import { useRef, useState } from "react";
import { useMediaLibrary, type MediaItem } from "./MediaLibrary";

export function UploadButton({ onUploaded, label = "Upload image" }: { onUploaded?: (m: MediaItem) => void; label?: string }) {
  const { upload } = useMediaLibrary();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const f of Array.from(files)) onUploaded?.(await upload(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Uploading…" : label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        hidden
        onChange={(e) => handle(e.target.files)}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}
