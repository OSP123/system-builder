import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { MediaImage } from "@/components/MediaImage";
import { Statlines } from "@/components/rulebook/Statline";
import { Banner, RulebookPage, RulebookQuote, Sidebar } from "@/components/rulebook/RulebookPage";
import { readProfile, readRules, STATUS_LABELS } from "@/lib/codex";
import { getPublishedCharacter } from "@/lib/queries";
import { loadWorld } from "../../data";

type Props = { params: Promise<{ world: string; slug: string }> };

async function load(params: Props["params"]) {
  const p = await params;
  const world = await loadWorld(p.world);
  const character = await getPublishedCharacter(world.id, p.slug);
  if (!character) notFound();
  return { world, character };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { character } = await load(params);
  return { title: character.name, description: character.summary ?? undefined };
}

export default async function CharacterPage({ params }: Props) {
  const { world, character: c } = await load(params);
  const base = `/w/${world.slug}`;
  const profile = readProfile(c.profile);
  const rules = readRules(c.specialRules);
  const home = c.homeworld?.published && c.homeworld.system.published ? c.homeworld : null;
  const columns = c.body.length < 3500;

  return (
    <div className="space-y-6">
      <Link href={`${base}/characters`} className="tap rubric hover:text-gold-bright">← Dramatis Personae</Link>
      <RulebookPage>
        {c.title && <p className="mb-2 text-center text-lg italic">{c.title}</p>}
        <Banner large as="h1">{c.name}</Banner>

        <div className="mt-8 grid gap-8 md:grid-cols-[240px_1fr]">
          <div className="space-y-4">
            {c.portraitImage ? (
              <MediaImage media={c.portraitImage} className="rulebook-art w-full" />
            ) : (
              <div className="rulebook-art flex aspect-[3/4] items-center justify-center font-book font-bold text-8xl text-[#e6dcc3]">
                {c.name.charAt(0)}
              </div>
            )}
            <Sidebar title="Record">
              <dl className="space-y-1.5">
                {c.faction && <Fact k="Allegiance" v={c.faction} />}
                <Fact k="Status" v={`${c.status === "DECEASED" ? "† " : ""}${STATUS_LABELS[c.status]}`} />
                {home && (
                  <Fact
                    k="Homeworld"
                    v={<Link className="underline" href={`${base}/systems/${home.system.slug}/${home.slug}`}>{home.name}</Link>}
                  />
                )}
              </dl>
            </Sidebar>
          </div>

          <div className="min-w-0 space-y-6">
            {c.quote && <RulebookQuote text={c.quote} source={c.quoteSource} />}
            {profile && (
              <div>
                <p className="rulebook-h">Profile</p>
                <Statlines profiles={[profile]} />
              </div>
            )}
            {c.body.trim() ? (
              <Markdown variant="rulebook" dropCap className={columns ? "rulebook-columns" : ""}>{c.body}</Markdown>
            ) : (
              c.summary && <p className="italic">{c.summary}</p>
            )}
          </div>
        </div>

        {(c.wargear.length > 0 || rules.length > 0) && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {c.wargear.length > 0 && (
              <Sidebar title="Wargear">
                <ul className="list-inside list-disc space-y-0.5">
                  {c.wargear.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </Sidebar>
            )}
            {rules.length > 0 && (
              <Sidebar title="Special Rules">
                <dl className="space-y-2">
                  {rules.map((r) => (
                    <div key={r.name}>
                      <dt className="inline font-bold italic">{r.name}. </dt>
                      <dd className="inline">{r.description}</dd>
                    </div>
                  ))}
                </dl>
              </Sidebar>
            )}
          </div>
        )}

        {c.narratives.length > 0 && (
          <div className="mt-8">
            <p className="rulebook-h">Appears In</p>
            <ul className="space-y-1">
              {c.narratives.map((n) => (
                <li key={n.slug}>
                  <Link href={`${base}/narratives/${n.slug}`} className="tap font-bold underline hover:text-[#7a1010]">{n.title}</Link>
                  {n.subtitle && <span className="italic">: {n.subtitle}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </RulebookPage>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.7rem] font-bold uppercase tracking-[0.14em]">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
