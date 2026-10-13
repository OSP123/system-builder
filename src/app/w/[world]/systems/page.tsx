import type { Metadata } from "next";
import Link from "next/link";
import { getWorldSystems } from "@/lib/queries";
import { normalizeTheme, themeVars } from "@/lib/theme";
import { loadWorld } from "../data";

type Props = { params: Promise<{ world: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const world = await loadWorld((await params).world);
  return { title: `Star Systems of ${world.name}` };
}

export default async function SystemsPage({ params }: Props) {
  const world = await loadWorld((await params).world);
  const systems = await getWorldSystems(world.id);

  return (
    <div>
      <p className="rubric">Astrographica</p>
      <h1 className="gothic-title mt-2 text-5xl sm:text-6xl">Star Systems</h1>
      <p className="mt-3 font-serif text-xl italic text-ash">
        Charted systems of {world.name}. The holo-chart is being consecrated and will follow.
      </p>

      {systems.length === 0 ? (
        <p className="mt-10 font-mono text-ash">+++ No systems have been charted +++</p>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {systems.map((s) => (
            <li key={s.id} className="cogitator p-5" style={themeVars(normalizeTheme(s.theme)) as React.CSSProperties}>
              <p className="text-[11px] uppercase tracking-[0.3em] opacity-70">
                +++ {[s.starType, s.segmentum].filter(Boolean).join(" // ") || "Uncatalogued"} +++
              </p>
              <Link href={`/w/${world.slug}/systems/${s.slug}`} className="mt-2 inline-block text-2xl uppercase tracking-widest">
                {s.name}
              </Link>
              {s.planets.length > 0 && (
                <ul className="mt-4 space-y-1 text-sm">
                  {s.planets.map((p) => (
                    <li key={p.slug}>
                      &gt;{" "}
                      <Link href={`/w/${world.slug}/systems/${s.slug}/${p.slug}`}>{p.name}</Link>
                      {p.classification && <span className="opacity-70"> [{p.classification}]</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
