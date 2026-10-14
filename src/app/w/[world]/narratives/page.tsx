import type { Metadata } from "next";
import Link from "next/link";
import { MediaImage } from "@/components/MediaImage";
import { Banner, RulebookPage } from "@/components/rulebook/RulebookPage";
import { getWorldNarratives } from "@/lib/queries";
import { loadWorld } from "../data";

type Props = { params: Promise<{ world: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const world = await loadWorld((await params).world);
  return { title: `Narratives of ${world.name}` };
}

export default async function NarrativesPage({ params }: Props) {
  const world = await loadWorld((await params).world);
  const narratives = await getWorldNarratives(world.id);

  return (
    <RulebookPage>
      <Banner large as="h1">Narratives</Banner>
      <p className="mx-auto mt-4 max-w-2xl text-center italic">Tales of {world.name}, recorded for those with the courage to read them.</p>

      {narratives.length === 0 ? (
        <p className="mt-10 text-center italic">The scribes have not yet set down any tales.</p>
      ) : (
        <ul className="mt-10 space-y-8">
          {narratives.map((n) => (
            <li key={n.id} className="border-b-2 border-[#15110d] pb-8 last:border-b-0">
              <Link href={`/w/${world.slug}/narratives/${n.slug}`} className="group grid gap-5 sm:grid-cols-[200px_1fr]">
                {n.coverImage ? (
                  <MediaImage media={n.coverImage} className="rulebook-art aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="rulebook-art hidden aspect-[4/3] items-center justify-center font-book font-bold text-7xl text-[#e6dcc3] sm:flex">
                    {n.title.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold uppercase tracking-[0.06em] group-hover:text-[#7a1010]">{n.title}</h2>
                  {n.subtitle && <p className="text-lg italic">{n.subtitle}</p>}
                  {n.epigraph && <p className="mt-3 border-l-4 border-[#15110d] pl-3 italic">“{n.epigraph}”</p>}
                  {n.summary && <p className="mt-3">{n.summary}</p>}
                  <p className="mt-3 text-sm font-bold uppercase tracking-[0.14em]">Read →</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RulebookPage>
  );
}
