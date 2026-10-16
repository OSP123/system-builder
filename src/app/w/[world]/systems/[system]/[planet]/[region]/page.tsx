import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { SkullDivider } from "@/components/ornament/Skull";
import { TacticalMap } from "@/components/regions/TacticalMap";
import { ThemeScope } from "@/components/ThemeScope";
import { getPublishedRegion } from "@/lib/queries";
import { formatLatLng, readSectors } from "@/lib/regions";
import { loadWorld } from "../../../../data";

type Props = { params: Promise<{ world: string; system: string; planet: string; region: string }> };

async function load(params: Props["params"]) {
  const p = await params;
  const world = await loadWorld(p.world);
  const region = await getPublishedRegion(world.id, p.system, p.planet, p.region);
  if (!region) notFound();
  return { world, region };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region } = await load(params);
  return { title: `${region.name} · ${region.planet.name}`, description: region.summary ?? undefined };
}

export default async function RegionPage({ params }: Props) {
  const { world, region } = await load(params);
  const { planet } = region;
  const planetHref = `/w/${world.slug}/systems/${planet.system.slug}/${planet.slug}`;
  const sectors = readSectors(region.sectors);
  const others = planet.regions.filter((r) => r.slug !== region.slug);

  return (
    <ThemeScope theme={planet.system.theme} backdrop={planet.system.backdropImage}>
      <div className="mx-auto max-w-5xl">
        <Link href={planetHref} className="tap rubric hover:text-gold-bright">← {planet.name}</Link>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.3em] text-phosphor/80">
          +++ {[region.kind, planet.name, formatLatLng(region.lat, region.lng)].filter(Boolean).join(" // ")} +++
        </p>
        <h1 className="gothic-title mt-3 text-5xl sm:text-6xl">{region.name}</h1>
        {region.terrain && <p className="mt-4 font-serif text-xl italic text-vellum">{region.terrain}</p>}

        {region.summary && (
          <div className="mt-8">
            <Markdown dropCap>{region.summary}</Markdown>
          </div>
        )}

        {sectors.length > 0 && (
          <section className="mt-10">
            <SkullDivider />
            <h2 className="mt-8 font-display text-2xl uppercase tracking-[0.2em] text-gold">Sectors</h2>
            <div className="mt-5">
              <TacticalMap sectors={sectors} title={region.name} />
            </div>
            <ol className="mt-6 divide-y divide-line border-y border-line">
              {sectors.map((s, i) => (
                <li key={s.name} className="flex items-baseline gap-4 py-3">
                  <span className="w-6 font-display text-blood-bright">{i + 1}</span>
                  <span className="flex-1 font-display text-lg tracking-wider text-parchment">{s.name}</span>
                  {s.pointsLevel !== undefined && (
                    <span className="font-mono text-xs uppercase tracking-widest text-ash">{s.pointsLevel} pts</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {others.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-xl uppercase tracking-[0.2em] text-gold">Elsewhere on {planet.name}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {others.map((r) => (
                <li key={r.slug}>
                  <Link href={`${planetHref}/${r.slug}`} className="btn btn-ghost">{r.name}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </ThemeScope>
  );
}
