import { thoughtForDate } from "@/lib/thoughts";
import { SkullDivider } from "./ornament/Skull";

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-12 pt-20">
      <SkullDivider />
      <div className="mt-8 text-center">
        <p className="rubric">Thought for the Day</p>
        <p className="mt-3 font-serif text-2xl italic text-vellum">“{thoughtForDate(new Date())}”</p>
      </div>
      <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-ash/70">
        +++ Archivum Cerulean · Transmission ends · The rest is silence +++
      </p>
      <p className="mt-3 text-center text-[11px] text-ash/60">
        Unofficial fan work. Warhammer 40,000 and related marks are trademarks of Games Workshop Ltd. No affiliation or endorsement is implied.
      </p>
    </footer>
  );
}
