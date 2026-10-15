import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { MediaImage } from "@/components/MediaImage";
import { SkullDivider } from "@/components/ornament/Skull";
import { ThemeScope } from "@/components/ThemeScope";
import { getPublishedSystem } from "@/lib/queries";
import { loadWorld } from "../../data";

type Props = { params: Promise<{ world: string; system: string }> };

async function load(params: Props["params"]) {
  const p = await params;
  const world = await loadWorld(p.world);
  const system = await getPublishedSystem(world.id, p.system);
  if (!system) notFound();
  return { world, system };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { system } = await load(params);
  return { title: `${system.name} System` };
}

export default async function SystemPage({ params }: Props) {
  const { world, system } = await load(params);
  const base = `/w/${world.slug}`;

  return (
    <ThemeScope theme={system.theme} backdrop={system.backdropImage}>
    <div className="mx-auto max-w-4xl">
      <Link href={`${base}/systems`} className="tap rubric hover:text-gold-bright">← Star Systems</Link>
      <h1 className="gothic-title mt-3 text-5xl sm:text-6xl">{system.name} System</h1>
      <p className="mt-3 font-mono text-xs uppercase tracking-[0.3em] text-phosphor/80">
        +++ {[system.starType, system.segmentum].filter(Boolean).join(" // ") || "Uncatalogued"} +++
      </p>
      <Link href={`/galaxy?system=${system.id}`} className="btn btn-ghost mt-5">Locate on the galaxy map</Link>

      {system.description && (
        <div className="mt-8">
          <Markdown>{system.description}</Markdown>
        </div>
      )}

      <SkullDivider className="mt-12" />
      <h2 className="mt-8 font-display text-2xl uppercase tracking-[0.2em] text-gold">Planetary Bodies</h2>
      {system.planets.length === 0 ? (
        <p className="mt-4 font-mono text-ash">+++ No bodies catalogued +++</p>
      ) : (
        <ol className="mt-6 space-y-4">
          {system.planets.map((p) => (
            <li key={p.id}>
              <Link href={`${base}/systems/${system.slug}/${p.slug}`} className="gothic-frame flex items-center gap-5 p-4">
                <span className="w-10 text-center font-display text-xl text-blood-bright">{toRoman(p.orbitIndex)}</span>
                {p.coverImage ? (
                  <MediaImage media={p.coverImage} className="grim-image h-16 w-16 rounded-full border border-gold/40 object-cover" />
                ) : (
                  <span className="h-16 w-16 rounded-full border border-gold/30 bg-[radial-gradient(circle_at_35%_30%,#8fbcd4,#2f5d7c_45%,#070605_80%)] shadow-[0_0_20px_rgba(47,93,124,0.5)]" />
                )}
                <span>
                  <span className="block font-display text-xl tracking-wider text-parchment">{p.name}</span>
                  {p.classification && <span className="font-serif italic text-ash">{p.classification}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {system.articles.length > 0 && (
        <>
          <h2 className="mt-12 font-display text-2xl uppercase tracking-[0.2em] text-gold">Related Records</h2>
          <div className="prose-lore mt-4">
            <ul>
              {system.articles.map((a) => (
                <li key={a.slug}>
                  <Link href={`${base}/lore/${a.slug}`}>{a.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
    </ThemeScope>
  );
}

function toRoman(n: number): string {
  if (n <= 0) return "–";
  const map: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}
