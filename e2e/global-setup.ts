import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

export const E2E_ADMIN = { email: "e2e-admin@test.dev", password: "e2e-password-123" };

export default async function globalSetup() {
  config({ path: ".env.test", override: true });
  const db = new PrismaClient();
  await db.$executeRawUnsafe('TRUNCATE "Article", "Planet", "StarSystem", "World", "Media", "User" CASCADE');
  await db.user.create({
    data: { email: E2E_ADMIN.email, passwordHash: await bcrypt.hash(E2E_ADMIN.password, 4), role: "ADMIN" },
  });
  await db.$disconnect();
}
