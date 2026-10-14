import type { Metadata } from "next";
import type { ForceSlot } from "@prisma/client";
import { ArmyEntry } from "@/components/rulebook/ArmyEntry";
import { Banner, RulebookPage } from "@/components/rulebook/RulebookPage";
import { FORCE_SLOTS, readProfiles, readRules, SLOT_LABELS } from "@/lib/codex";
import { getWorldUnits } from "@/lib/queries";
import { loadWorld } from "../data";

type Props = { params: Promise<{ world: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const world = await loadWorld((await params).world);
  return { title: `Army List of ${world.name}` };
}

export default async function ArmyListPage({ params }: Props) {
  const world = await loadWorld((await params).world);
  const units = await getWorldUnits(world.id);
  const bySlot = new Map<ForceSlot, typeof units>();
  for (const u of units) bySlot.set(u.slot, [...(bySlot.get(u.slot) ?? []), u]);

  return (
    <RulebookPage>
      <Banner large as="h1">Army List</Banner>
      <p className="mx-auto mt-4 max-w-2xl text-center italic">
        The forces that may be mustered in defence of {world.name}, arranged by their place in the Force Organisation chart.
      </p>

      {units.length === 0 && <p className="mt-10 text-center italic">No forces have yet been mustered.</p>}

      {FORCE_SLOTS.filter((s) => bySlot.has(s)).map((slot) => (
        <section key={slot} className="mt-10">
          <Banner>{SLOT_LABELS[slot]}</Banner>
          <div className="mt-6 space-y-8">
            {bySlot.get(slot)!.map((u) => (
              <div key={u.id} className="border-b-2 border-[#15110d] pb-6 last:border-b-0">
                <ArmyEntry
                  name={u.name}
                  href={`/w/${world.slug}/units/${u.slug}`}
                  points={u.points}
                  squad={u.squad}
                  profiles={readProfiles(u.profiles)}
                  wargear={u.wargear}
                  options={u.options}
                  specialRules={readRules(u.specialRules)}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </RulebookPage>
  );
}
