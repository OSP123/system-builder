/**
 * Ensures the admin account from ADMIN_EMAIL exists (see src/lib/seed-admin.ts
 * for when ADMIN_PASSWORD is applied) and an empty "Cerulean" world owned by it.
 * Safe to run repeatedly.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ensureAdmin } from "../src/lib/seed-admin";

const db = new PrismaClient();

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_RESET_PASSWORD } = process.env;
  const { admin, action } = await ensureAdmin(db, { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_RESET_PASSWORD });

  await db.world.upsert({
    where: { slug: "cerulean" },
    update: {},
    create: { slug: "cerulean", name: "Cerulean", tagline: "", ownerId: admin.id },
  });

  const messages = {
    created: "created",
    "password-reset": "password reset from ADMIN_PASSWORD (remove ADMIN_RESET_PASSWORD now)",
    unchanged: "exists; password left unchanged",
  };
  console.log(`Admin ${admin.email}: ${messages[action]}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
