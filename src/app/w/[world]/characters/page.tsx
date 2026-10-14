import type { Metadata } from "next";
import Link from "next/link";
import { MediaImage } from "@/components/MediaImage";
import { Banner, RulebookPage } from "@/components/rulebook/RulebookPage";
import { STATUS_LABELS } from "@/lib/codex";
import { getWorldCharacters } from "@/lib/queries";
import { loadWorld } from "../data";

type Props = { params: Promise<{ world: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const world = await loadWorld((await params).world);
  return { title: `Characters of ${world.name}` };
}

export default async function CharactersPage({ params }: Props) {
  const world = await loadWorld((await params).world);
  const characters = await getWorldCharacters(world.id);

  return (
    <RulebookPage>
      <Banner large as="h1">Dramatis Personae</Banner>
      <p className="mx-auto mt-4 max-w-2xl text-center italic">
        The heroes, villains and souls of note whose deeds are written in the annals of {world.name}.
      </p>

      {characters.length === 0 ? (
        <p className="mt-10 text-center italic">No names have yet been entered into the annals.</p>
      ) : (
        <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {characters.map((c) => (
            <li key={c.id}>
              <Link href={`/w/${world.slug}/characters/${c.slug}`} className="group flex gap-4">
                <div className="h-28 w-24 flex-none overflow-hidden rulebook-art">
                  {c.portraitImage ? (
                    <MediaImage media={c.portraitImage} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center font-book font-bold text-5xl text-[#e6dcc3]">{c.name.charAt(0)}</div>
                  )}
                </div>
                <div className="min-w-0 border-b-2 border-[#15110d] pb-2">
                  {c.title && <p className="text-sm italic">{c.title}</p>}
                  <p className="text-xl font-bold uppercase tracking-[0.06em] group-hover:text-[#7a1010]">{c.name}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em]">
                    {c.status === "DECEASED" && "† "}
                    {[c.faction, STATUS_LABELS[c.status]].filter(Boolean).join(" · ")}
                  </p>
                  {c.summary && <p className="mt-1 line-clamp-2 text-[0.95rem] leading-snug">{c.summary}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RulebookPage>
  );
}
