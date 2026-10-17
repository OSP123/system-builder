import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { MediaImage } from "@/components/MediaImage";
import { NarrationPlayer } from "@/components/NarrationPlayer";
import { Banner, RulebookPage, RulebookQuote, Sidebar } from "@/components/rulebook/RulebookPage";
import { chapterHeadings } from "@/lib/codex";
import { getPublishedNarrative } from "@/lib/queries";
import { loadWorld } from "../../data";

type Props = { params: Promise<{ world: string; slug: string }> };

async function load(params: Props["params"]) {
  const p = await params;
  const world = await loadWorld(p.world);
  const narrative = await getPublishedNarrative(world.id, p.slug);
  if (!narrative) notFound();
  return { world, narrative };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { narrative } = await load(params);
  return { title: narrative.title, description: narrative.summary ?? undefined };
}

export default async function NarrativePage({ params }: Props) {
  const { world, narrative: n } = await load(params);
  const base = `/w/${world.slug}`;
  const chapters = chapterHeadings(n.body);
  const setting = n.planet?.published && n.planet.system.published ? n.planet : null;
  const region = setting && n.region?.published && n.region.planetId === n.planetId ? n.region : null;

  return (
    <div className="space-y-6">
      <Link href={`${base}/narratives`} className="tap rubric hover:text-gold-bright">← Narratives</Link>
      <RulebookPage>
        {n.coverImage && <MediaImage media={n.coverImage} className="rulebook-art mb-8 w-full" />}
        <Banner large as="h1">{n.title}</Banner>
        {n.subtitle && <p className="mt-3 text-center text-xl italic">{n.subtitle}</p>}
        {n.epigraph && (
          <div className="mt-8">
            <RulebookQuote text={n.epigraph} source={n.epigraphSource} />
          </div>
        )}
        {n.narration && (
          <div className="mx-auto mt-8 max-w-[68ch]">
            <NarrationPlayer recording={n.narration} variant="rulebook" label="Hear this account read aloud" />
          </div>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_220px]">
          {/* Long fiction reads best in one column; the rulebook look comes from type, rules and frame. */}
          <Markdown variant="rulebook" dropCap anchors className="mx-auto w-full max-w-[68ch]">
            {n.body || "*The pages are blank.*"}
          </Markdown>

          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {chapters.length >= 2 && (
              <Sidebar title="Contents">
                <ol className="space-y-1">
                  {chapters.map((c) => (
                    <li key={c.id} className={c.level === 3 ? "pl-3 text-sm" : "font-bold"}>
                      <a href={`#${c.id}`} className="tap hover:text-[#7a1010] hover:underline">{c.text}</a>
                    </li>
                  ))}
                </ol>
              </Sidebar>
            )}
            {n.characters.length > 0 && (
              <Sidebar title="Featuring">
                <ul className="space-y-2">
                  {n.characters.map((c) => (
                    <li key={c.slug}>
                      <Link href={`${base}/characters/${c.slug}`} className="tap font-bold uppercase tracking-[0.04em] hover:text-[#7a1010]">
                        {c.name}
                      </Link>
                      {c.title && <span className="block text-sm italic">{c.title}</span>}
                    </li>
                  ))}
                </ul>
              </Sidebar>
            )}
            {setting && (
              <Sidebar title="Setting">
                <Link href={`${base}/systems/${setting.system.slug}/${setting.slug}`} className="underline hover:text-[#7a1010]">
                  {setting.name}
                </Link>
                {region && (
                  <>
                    {" · "}
                    <Link href={`${base}/systems/${setting.system.slug}/${setting.slug}/${region.slug}`} className="underline hover:text-[#7a1010]">
                      {region.name}
                    </Link>
                  </>
                )}
              </Sidebar>
            )}
          </div>
        </div>

        <p className="mt-12 text-center text-sm font-bold uppercase tracking-[0.3em]">+++ Here ends the account +++</p>
      </RulebookPage>
    </div>
  );
}
