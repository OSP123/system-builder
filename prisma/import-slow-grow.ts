/**
 * One-time import of the slow-grow-trainer campaign into Vespera Prime.
 * Reads the JSON exports in data/imports/slow-grow/ (git-ignored) and, if
 * present, profiles.csv or Supabase's profiles_rows.csv (only id, commander_name,
 * army_faction, army_subfaction, army_lore and warlord_name are read). Safe to re-run: see src/lib/importers/slow-grow-db.ts.
 *
 *   npm run db:import-slow-grow            # or with DATABASE_URL=... for another database
 */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  armyArticles,
  battleNarratives,
  controlSnapshots,
  eventArticles,
  profilesFromCsv,
  warlordCharacters,
  type Award,
  type CampaignState,
  type GlobalEvent,
  type Matchup,
  type Profile,
  type Territory,
} from "../src/lib/importers/slow-grow";
import { importSlowGrow } from "../src/lib/importers/slow-grow-db";

const dir = process.argv[2] ?? join(process.cwd(), "data/imports/slow-grow");
const read = <T>(name: string): T[] => {
  const file = join(dir, `${name}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T[]) : [];
};

const db = new PrismaClient();

async function main() {
  if (!existsSync(join(dir, "matchups.json"))) throw new Error(`No export found in ${dir}`);
  const csv = ["profiles.csv", "profiles_rows.csv"].map((f) => join(dir, f)).find((f) => existsSync(f));
  const profiles: Profile[] = csv ? profilesFromCsv(readFileSync(csv, "utf8")) : [];
  console.log(profiles.length ? `Using ${profiles.length} commander profiles.` : "No profiles.csv: battles will not name commanders.");

  const report = await importSlowGrow(db, "vespera-prime", {
    articles: [
      ...eventArticles(read<GlobalEvent>("global_events")),
      ...armyArticles(profiles),
    ],
    characters: warlordCharacters(profiles),
    narratives: battleNarratives(read<Matchup>("matchups"), read<Award>("campaign_awards"), profiles),
    control: controlSnapshots(read<Territory>("territories"), read<CampaignState>("campaign_state")[0]),
  });

  console.log(
    `${report.created.length} created, ${report.updated.length} updated, ${report.removed.length} removed, ${report.kept.length} left as they were.`,
  );
  if (report.removed.length) console.log(`  removed ${report.removed.length} old lore copies of battle reports (now narratives)`);
  for (const line of report.updated) console.log(`  updated ${line}`);
  for (const line of report.kept.filter((l) => l.includes("edited"))) console.log(`  kept ${line}`);
  if (report.unmatchedRegions.length) console.warn(`No region named: ${report.unmatchedRegions.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
