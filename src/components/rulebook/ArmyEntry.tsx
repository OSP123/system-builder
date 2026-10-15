import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import type { SpecialRule, StatProfile } from "@/lib/codex";
import { Statlines } from "./Statline";

type Props = {
  name: string;
  href?: string;
  points?: string | null;
  squad?: string | null;
  profiles: StatProfile[];
  wargear: string[];
  options?: string | null;
  specialRules: SpecialRule[];
};

/** A codex army list entry: name ..... points, statline, then Squad / Wargear / Options / Special Rules. */
export function ArmyEntry({ name, href, points, squad, profiles, wargear, options, specialRules }: Props) {
  return (
    <article className="break-inside-avoid">
      <div className="rulebook-leader flex-wrap font-bold uppercase tracking-[0.06em]">
        <h3 className="min-w-0 text-lg">{href ? <Link href={href} className="tap hover:text-[#7a1010]">{name}</Link> : name}</h3>
        {points && (
          <>
            <span className="dots" aria-hidden />
            <span className="ml-auto whitespace-nowrap">{points}</span>
          </>
        )}
      </div>
      {profiles.length > 0 && (
        <div className="mt-2">
          <Statlines profiles={profiles} />
        </div>
      )}
      <div className="mt-3 space-y-2 text-[0.98rem] leading-snug">
        {squad && (
          <p>
            <span className="rulebook-label">Squad: </span>
            {squad}
          </p>
        )}
        {wargear.length > 0 && (
          <p>
            <span className="rulebook-label">Wargear: </span>
            {wargear.join(", ")}.
          </p>
        )}
        {options && (
          <div>
            <span className="rulebook-label">Options:</span>
            <Markdown variant="rulebook" className="mt-1 text-[0.98rem]">{options}</Markdown>
          </div>
        )}
        {specialRules.length > 0 && (
          <div>
            <p className="rulebook-label">Special Rules</p>
            <dl className="mt-1 space-y-1.5">
              {specialRules.map((r) => (
                <div key={r.name}>
                  <dt className="inline font-bold italic">{r.name}. </dt>
                  <dd className="inline">{r.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </article>
  );
}
