import { narrationFor } from "@/lib/narration";

type Props = {
  recording: { id: string; key: string; durationSec: number | null } | null | undefined;
  /** "archive" for the dark lore pages, "rulebook" for parchment pages. */
  variant?: "archive" | "rulebook";
  label?: string;
};

const minutes = (s: number) => (s < 60 ? `${s} sec` : `${Math.round(s / 60)} min`);

/** A captioned audio player for an entry's spoken narration. */
export function NarrationPlayer({ recording, variant = "archive", label = "Hear it read aloud" }: Props) {
  const n = narrationFor(recording);
  if (!n) return null;
  const rulebook = variant === "rulebook";
  return (
    <figure
      className={rulebook ? "border-y-2 border-[#1c1712] py-3" : "border border-line bg-black/40 p-3"}
      style={{ colorScheme: rulebook ? "light" : "dark" }}
    >
      <figcaption
        className={
          rulebook
            ? "mb-2 text-center text-sm font-bold uppercase tracking-[0.3em]"
            : "mb-2 font-display text-xs uppercase tracking-[0.25em] text-ash"
        }
      >
        <span className={rulebook ? "" : "text-blood-bright"}>{label}</span>
        {n.durationSec ? <span className={rulebook ? "font-normal" : ""}> · {minutes(n.durationSec)}</span> : null}
      </figcaption>
      {/* No captions file: the full text is on the page. */}
      <audio controls preload="none" src={n.url} className="w-full" />
    </figure>
  );
}
