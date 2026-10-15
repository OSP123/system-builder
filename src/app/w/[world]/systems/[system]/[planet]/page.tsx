import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { MediaImage } from "@/components/MediaImage";
import { ThemeScope } from "@/components/ThemeScope";
import { CATEGORY_LABELS } from "@/lib/categories";
import { getPublishedPlanet } from "@/lib/queries";
import { archiveRef } from "@/lib/thoughts";
import { loadWorld } from "../../../data";

type Props = { params: Promise<{ world: string; system: string; planet: string }> };

async function load(params: Props["params"]) {
  const p = await params;
  const world = await loadWorld(p.world);
  const planet = await getPublishedPlanet(world.id, p.system, p.planet);
  if (!planet) notFound();
  return { world, planet };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { planet } = await load(params);
  return { title: planet.name };
}

export default async function PlanetPage({ params }: Props) {
  const { world, planet } = await load(params);
  const base = `/w/${world.slug}`;
  const facts = [
    ["Classification", planet.classification],
    ["Population", planet.population],
    ["Tithe Grade", planet.titheGrade],
    ["System", planet.system.name],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <ThemeScope theme={planet.system.theme} backdrop={planet.system.backdropImage}>
    <div className="mx-auto max-w-5xl">
      <Link href={`${base}/systems/${planet.system.slug}`} className="tap rubric hover:text-gold-bright">
        ← {planet.system.name} System
      </Link>
      <div className="mt-4 grid gap-10 md:grid-cols-[1fr_300px]">
        <div>
          <h1 className="gothic-title text-6xl sm:text-7xl">{planet.name}</h1>
          {planet.coverImage && (
            <div className="gothic-frame mt-8 p-2">
              <MediaImage media={planet.coverImage} className="grim-image w-full" />
            </div>
          )}
          {planet.description && (
            <div className="mt-8">
              <Markdown>{planet.description}</Markdown>
            </div>
          )}
        </div>
        <aside className="cogitator h-fit p-5 text-sm">
          <h2 className="text-xs tracking-[0.3em]">IMPERIAL RECORD</h2>
          <p className="mt-1 text-[11px] tracking-[0.2em] opacity-60">{`REF ${archiveRef(planet.id)} // CLEARANCE GRANTED`}</p>
          <dl className="mt-5 space-y-3">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] uppercase tracking-[0.25em] opacity-60">{k}</dt>
                <dd className="text-base">{v}</dd>
              </div>
            ))}
          </dl>
          {planet.articles.length > 0 && (
            <>
              <h3 className="mt-6 border-t border-phosphor/20 pt-4 text-xs tracking-[0.3em]">LINKED RECORDS</h3>
              <ul className="mt-3 space-y-2">
                {planet.articles.map((a) => (
                  <li key={a.slug}>
                    &gt; <Link href={`${base}/lore/${a.slug}`}>{a.title}</Link>
                    <span className="block pl-4 text-[11px] uppercase tracking-widest opacity-60">{CATEGORY_LABELS[a.category]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-6 cursor-blink text-[11px] uppercase tracking-[0.2em] opacity-70">Awaiting query</p>
        </aside>
      </div>
    </div>
    </ThemeScope>
  );
}
