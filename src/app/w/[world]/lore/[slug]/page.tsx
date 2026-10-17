import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { NarrationPlayer } from "@/components/NarrationPlayer";
import { MediaImage } from "@/components/MediaImage";
import { InkSplatter } from "@/components/ornament/InkSplatter";
import { SkullDivider } from "@/components/ornament/Skull";
import { CATEGORY_LABELS } from "@/lib/categories";
import { getPublishedArticle } from "@/lib/queries";
import { archiveRef } from "@/lib/thoughts";
import { loadWorld } from "../../data";

type Props = { params: Promise<{ world: string; slug: string }> };

async function load(params: Props["params"]) {
  const { world: worldSlug, slug } = await params;
  const world = await loadWorld(worldSlug);
  const article = await getPublishedArticle(world.id, slug);
  if (!article) notFound();
  return { world, article };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { article } = await load(params);
  return { title: article.title, description: article.summary ?? undefined };
}

export default async function ArticlePage({ params }: Props) {
  const { world, article } = await load(params);
  const base = `/w/${world.slug}`;

  return (
    <article className="relative mx-auto max-w-3xl">
      <InkSplatter seed={article.title.length * 7 + 1} className="pointer-events-none absolute -right-24 -top-16 -z-10 hidden h-80 w-80 text-blood/35 sm:block" />

      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-phosphor/80">
        +++ Record {archiveRef(article.id)} ·{" "}
        <Link href={`${base}?category=${article.category}`} className="hover:text-phosphor">
          {CATEGORY_LABELS[article.category]}
        </Link>{" "}
        +++
      </p>
      <h1 className="gothic-title mt-4 text-6xl sm:text-7xl">{article.title}</h1>
      {article.summary && <p className="mt-5 font-serif text-xl italic text-vellum">{article.summary}</p>}

      {(article.system?.published || article.planet?.published) && (
        <p className="mt-5 font-display text-xs uppercase tracking-[0.25em] text-ash">
          <span className="text-blood-bright">Locus ·</span>{" "}
          {article.planet?.published ? (
            <>
              <Link className="text-cerulean-bright hover:text-gold-bright" href={`${base}/systems/${article.planet.system.slug}/${article.planet.slug}`}>
                {article.planet.name}
              </Link>
              {article.region?.published && (
                <>
                  {" · "}
                  <Link
                    className="text-cerulean-bright hover:text-gold-bright"
                    href={`${base}/systems/${article.planet.system.slug}/${article.planet.slug}/${article.region.slug}`}
                  >
                    {article.region.name}
                  </Link>
                </>
              )}
            </>
          ) : (
            <Link className="text-cerulean-bright hover:text-gold-bright" href={`${base}/systems/${article.system!.slug}`}>
              {article.system!.name} System
            </Link>
          )}
        </p>
      )}

      {article.narration && (
        <div className="mt-8">
          <NarrationPlayer recording={article.narration} label="Hear this record read aloud" />
        </div>
      )}

      <SkullDivider className="mt-8" />

      {article.coverImage && (
        <figure className="gothic-frame mt-10 p-2">
          <MediaImage media={article.coverImage} className="grim-image w-full" />
          {article.coverImage.alt && (
            <figcaption className="mt-2 text-center font-serif italic text-ash">{article.coverImage.alt}</figcaption>
          )}
        </figure>
      )}

      <div className="mt-10">
        {article.body.trim() ? (
          <Markdown dropCap>{article.body}</Markdown>
        ) : (
          <div className="cogitator p-6 text-sm uppercase tracking-widest">
            <p>+++ Record incomplete +++</p>
            <p className="mt-2 cursor-blink opacity-80">Data-stacks corrupted or withheld. Await further transcription</p>
          </div>
        )}
      </div>

      {article.tags.length > 0 && (
        <ul className="mt-14 flex flex-wrap gap-2">
          {article.tags.map((t) => (
            <li key={t} className="border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ash">
              #{t}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.35em] text-blood-bright/80">
        +++ End of record +++
      </p>
    </article>
  );
}
