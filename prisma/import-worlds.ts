/**
 * Imports the worlds defined in src/lib/worlds/ (create-only, safe to re-run),
 * owned by the admin account from ADMIN_EMAIL. Run after db:seed.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { importWorld } from "../src/lib/world-import";
import { WORLDS } from "../src/lib/worlds";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("Set ADMIN_EMAIL");
  const admin = await db.user.findUnique({ where: { email } });
  if (!admin) throw new Error(`Admin ${email} not found. Run \`npm run db:seed\` first.`);

  for (const spec of WORLDS) {
    const { created, skipped } = await importWorld(db, admin.id, spec);
    console.log(`${spec.world.name}: ${created.length} created, ${skipped.length} already present.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
