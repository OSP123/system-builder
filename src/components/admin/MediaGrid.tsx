"use client";
/* eslint-disable @next/next/no-img-element */

import { deleteMedia, updateMediaAlt } from "@/app/admin/actions";
import { mediaUrl, useMediaLibrary } from "./MediaLibrary";
import { UploadButton } from "./UploadButton";

export function MediaGrid() {
  const { items, remove, canEdit } = useMediaLibrary();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl">Media library</h2>
          <p className="text-sm text-ash">JPEG, PNG, WebP, GIF or AVIF, up to 10 MB each.</p>
        </div>
        <UploadButton label="Upload images" />
      </div>
      {items.length === 0 ? (
        <p className="text-ash">No images uploaded yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <li key={m.id} className="gothic-frame overflow-hidden">
              <a href={mediaUrl(m.key)} target="_blank" rel="noreferrer">
                <img src={mediaUrl(m.key)} alt={m.alt ?? ""} className="aspect-video w-full object-cover" />
              </a>
              <div className="space-y-2 p-3">
                <p className="truncate text-xs text-ash" title={m.originalName}>{m.originalName}</p>
                {canEdit(m) ? (
                  <>
                    <form action={updateMediaAlt.bind(null, m.id)} className="flex gap-2">
                      <input name="alt" defaultValue={m.alt ?? ""} placeholder="Caption / alt text" className="field py-1 text-xs" />
                      <button type="submit" className="tap px-1 text-xs text-cerulean-bright">Save</button>
                    </form>
                    <div className="flex justify-between text-xs">
                      <button
                        type="button"
                        className="tap text-ash hover:text-parchment"
                        onClick={() => navigator.clipboard.writeText(`![${m.alt ?? ""}](${mediaUrl(m.key)})`)}
                      >
                        Copy Markdown
                      </button>
                      <button
                        type="button"
                        className="tap text-red-400 hover:text-red-300"
                        onClick={async () => {
                          if (!confirm("Delete this image? Any page using it as a cover will lose it.")) return;
                          await deleteMedia(m.id);
                          remove(m.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {m.alt && <p className="text-xs italic text-parchment">{m.alt}</p>}
                    <button
                      type="button"
                      className="tap text-xs text-ash hover:text-parchment"
                      onClick={() => navigator.clipboard.writeText(`![${m.alt ?? ""}](${mediaUrl(m.key)})`)}
                    >
                      Copy Markdown
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
