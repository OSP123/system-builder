"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type MediaItem = { id: string; key: string; alt: string | null; originalName: string; uploadedById: string };

type Ctx = {
  worldId: string;
  /** Whether the current user may caption or delete an upload (its uploader, or an admin). */
  canEdit: (item: MediaItem) => boolean;
  items: MediaItem[];
  upload: (file: File) => Promise<MediaItem>;
  remove: (id: string) => void;
};

const MediaContext = createContext<Ctx | null>(null);

/** Shares a world's image library with every picker/editor on the page, so new uploads show up everywhere. */
export function MediaLibraryProvider({
  worldId,
  initial,
  currentUserId,
  isAdmin,
  children,
}: {
  worldId: string;
  initial: MediaItem[];
  currentUserId: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState(initial);

  const upload = useCallback(
    async (file: File) => {
      const body = new FormData();
      body.set("file", file);
      body.set("worldId", worldId);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Upload failed (${res.status})`);
      const item: MediaItem = json.media;
      setItems((prev) => [item, ...prev]);
      return item;
    },
    [worldId],
  );

  const remove = useCallback((id: string) => setItems((prev) => prev.filter((m) => m.id !== id)), []);

  return <MediaContext.Provider
      value={{ worldId, items, upload, remove, canEdit: (m) => isAdmin || m.uploadedById === currentUserId }}
    >{children}</MediaContext.Provider>;
}

export function useMediaLibrary() {
  const ctx = useContext(MediaContext);
  if (!ctx) throw new Error("useMediaLibrary must be used inside MediaLibraryProvider");
  return ctx;
}

export const mediaUrl = (key: string) => `/media/${key}`;
