import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MediaImage } from "@/components/MediaImage";
import { Emblem } from "@/components/ornament/Emblem";
import { InkSplatter } from "@/components/ornament/InkSplatter";
import { SkullDivider } from "@/components/ornament/Skull";
import { getPublishedWorlds } from "@/lib/queries";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function Home() {
  const worlds = await getPublishedWorlds();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4">
        <section className="relative pb-14 pt-16 text-center">
          <InkSplatter seed={7} className="pointer-events-none absolute left-1/2 top-4 -z-10 h-[min(420px,100vw)] w-[min(420px,100vw)] -translate-x-1/2 text-blood/40" />
          <Emblem className="mx-auto h-28 w-auto" />
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.45em] text-blood-bright">+++ {SITE.tagline} +++</p>
          <h1 className="gothic-title mt-5 text-6xl sm:text-8xl">Worlds Beyond the Astronomican</h1>
          <p className="mx-auto mt-6 max-w-2xl font-serif text-xl italic text-ash">
            Chronicles, star charts and sealed records of the forgotten worlds, kept in the grim darkness of the far future.
          </p>
        </section>

        <SkullDivider className="mb-12" />

        {worlds.length === 0 ? (
          <p className="text-center font-mono text-ash">+++ No worlds have been unsealed +++</p>
        ) : (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {worlds.map((w) => (
              <li key={w.id}>
                <Link href={`/w/${w.slug}`} className="gothic-frame group block p-2">
                  <div className="aspect-[16/9] overflow-hidden border border-line bg-hull">
                    {w.coverImage ? (
                      <MediaImage media={w.coverImage} className="grim-image h-full w-full object-cover" />
                    ) : (
                      <div className="relative flex h-full items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(59,40,22,0.6),transparent_75%)]">
                        <InkSplatter seed={w.name.length * 13} className="absolute h-[140%] w-[140%] text-black/70" />
                        <span className="gothic-title relative text-7xl text-vellum/60">{w.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="px-3 pb-3 pt-4">
                    <h2 className="gothic-title text-4xl">{w.name}</h2>
                    {w.tagline && <p className="mt-2 font-serif text-lg italic text-ash">{w.tagline}</p>}
                    <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-phosphor/80">
                      {w._count.articles} records on file
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
