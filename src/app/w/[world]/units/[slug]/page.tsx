import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { MediaImage } from "@/components/MediaImage";
import { ArmyEntry } from "@/components/rulebook/ArmyEntry";
import { Banner, RulebookPage } from "@/components/rulebook/RulebookPage";
import { readProfiles, readRules, SLOT_LABELS } from "@/lib/codex";
import { getPublishedUnit } from "@/lib/queries";
import { loadWorld } from "../../data";

type Props = { params: Promise<{ world: string; slug: string }> };

async function load(params: Props["params"]) {
  const p = await params;
  const world = await loadWorld(p.world);
  const unit = await getPublishedUnit(world.id, p.slug);
  if (!unit) notFound();
  return { world, unit };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { unit } = await load(params);
  return { title: unit.name };
}

export default async function UnitPage({ params }: Props) {
  const { world, unit: u } = await load(params);
  const columns = u.description.length < 3500;

  return (
    <div className="space-y-6">
      <Link href={`/w/${world.slug}/units`} className="tap rubric hover:text-gold-bright">← Army List</Link>
      <RulebookPage>
        <p className="mb-2 text-center text-sm font-bold uppercase tracking-[0.2em]">
          {[SLOT_LABELS[u.slot], u.faction].filter(Boolean).join(" · ")}
        </p>
        <Banner large as="h1">{u.name}</Banner>

        {u.image && <MediaImage media={u.image} className="rulebook-art mt-8 w-full" />}

        {u.description.trim() && (
          <Markdown variant="rulebook" dropCap className={`mt-8 ${columns ? "rulebook-columns" : ""}`}>
            {u.description}
          </Markdown>
        )}

        <div className="rulebook-sidebar mt-10">
          <p className="head">Army List Entry</p>
          <div className="p-3 sm:p-4">
            <ArmyEntry
              name={u.name}
              points={u.points}
              squad={u.squad}
              profiles={readProfiles(u.profiles)}
              wargear={u.wargear}
              options={u.options}
              specialRules={readRules(u.specialRules)}
            />
          </div>
        </div>
      </RulebookPage>
    </div>
  );
}
