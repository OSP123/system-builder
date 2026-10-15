import type { Metadata } from "next";
import Link from "next/link";
import type { ArticleCategory } from "@prisma/client";
import { Markdown } from "@/components/Markdown";
import { MediaImage } from "@/components/MediaImage";
import { Emblem } from "@/components/ornament/Emblem";
import { InkSplatter } from "@/components/ornament/InkSplatter";
import { SkullDivider } from "@/components/ornament/Skull";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import { getWorldArticles } from "@/lib/queries";
import { loadWorld } from "./data";

type Props = { params: Promise<{ world: string }>; searchParams: Promise<{ category?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const world = await loadWorld((await params).world);
  return { title: world.name, description: world.tagline ?? undefined };
}

export default async function WorldPage({ params, searchParams }: Props) {
  const world = await loadWorld((await params).world);
  const { category: rawCategory } = await searchParams;
  const category = CATEGORIES.includes(rawCategory as ArticleCategory) ? (rawCategory as ArticleCategory) : undefined;
  const articles = await getWorldArticles(world.id, category);

  const grouped = new Map<ArticleCategory, typeof articles>();
  for (const a of articles) grouped.set(a.category, [...(grouped.get(a.category) ?? []), a]);
  const presentCategories = category ? [category] : CATEGORIES.filter((c) => grouped.has(c));

  return (
    <div>
      <section className="gothic-frame relative overflow-hidden">
        {world.coverImage && (
          <MediaImage media={world.coverImage} className="grim-image absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-transparent" />
        <InkSplatter seed={3} className="pointer-events-none absolute -left-16 -top-20 h-80 w-80 text-blood/45" />
        <InkSplatter seed={19} className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 text-black/80" />
        <div className="relative px-6 py-16 text-center sm:px-12 sm:py-20">
          <Emblem className="mx-auto h-20 w-auto" />
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.4em] text-blood-bright">+++ Sealed by order of the Administratum +++</p>
          <h1 className="gothic-title mt-4 text-7xl sm:text-9xl">{world.name}</h1>
          {world.tagline && <p className="mt-4 font-serif text-2xl italic text-vellum">{world.tagline}</p>}
        </div>
      </section>

      {world.summary && !category && (
        <section className="mx-auto mt-14 max-w-3xl">
          <Markdown>{world.summary}</Markdown>
        </section>
      )}

      <section className="mt-16">
        <SkullDivider />
        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rubric">Archivum</p>
            <h2 className="gothic-title mt-1 text-5xl">
              {category ? CATEGORY_LABELS[category] : "The Records"}
            </h2>
          </div>
          {category && (
            <Link href={`/w/${world.slug}`} className="tap btn btn-ghost">
              ← All records
            </Link>
          )}
        </div>

        {articles.length === 0 && <p className="mt-6 font-mono text-ash">+++ No records have been declassified +++</p>}

        {presentCategories.map((c) => (
          <div key={c} className="mt-10">
            <h3 className="flex items-center gap-3 font-display text-xl uppercase tracking-[0.2em] text-vellum">
              <span className="text-blood-bright">✠</span>
              <Link href={`/w/${world.slug}?category=${c}`} className="hover:text-gold-bright">
                {CATEGORY_LABELS[c]}
              </Link>
              <span className="ink-rule flex-1" />
            </h3>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(grouped.get(c) ?? []).map((a) => (
                <li key={a.id}>
                  <Link href={`/w/${world.slug}/lore/${a.slug}`} className="gothic-frame flex h-full gap-4 p-4">
                    {a.coverImage && (
                      <MediaImage media={a.coverImage} className="grim-image h-16 w-16 flex-none border border-line object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="font-gothic text-2xl font-bold leading-none text-parchment [text-shadow:1px_1px_0_#000]">{a.title}</p>
                      {a.summary && <p className="mt-2 line-clamp-3 font-serif text-base italic leading-snug text-ash">{a.summary}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
