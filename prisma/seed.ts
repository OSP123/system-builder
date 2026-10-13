/**
 * Creates (or updates the password of) the admin account from ADMIN_EMAIL /
 * ADMIN_PASSWORD, and an empty, unpublished "Cerulean" world owned by it.
 * Safe to run repeatedly.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
  if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters");

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await db.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN" },
    create: { email, passwordHash, role: "ADMIN", name: "Archivist" },
  });

  await db.world.upsert({
    where: { slug: "cerulean" },
    update: {},
    create: {
      slug: "cerulean",
      name: "Cerulean",
      tagline: "",
      ownerId: admin.id,
    },
  });

  console.log(`Admin ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
