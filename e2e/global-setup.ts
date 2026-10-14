import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { rm } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

export const E2E_ADMIN = { email: "e2e-admin@test.dev", password: "e2e-password-123" };
export const E2E_RESET_USER = { email: "forgetful@test.dev", password: "forgetful-old-pw" };

export default async function globalSetup() {
  config({ path: ".env.test", override: true });
  const db = new PrismaClient();
  await db.$executeRawUnsafe('TRUNCATE "PasswordResetToken", "Narrative", "Character", "Unit", "Article", "Planet", "StarSystem", "World", "Media", "User" CASCADE');
  await db.user.create({
    data: { email: E2E_ADMIN.email, passwordHash: await bcrypt.hash(E2E_ADMIN.password, 4), role: "ADMIN" },
  });
  await db.user.create({
    data: { email: E2E_RESET_USER.email, name: "Forgetful Scribe", passwordHash: await bcrypt.hash(E2E_RESET_USER.password, 4) },
  });
  await db.$disconnect();
  await rm(process.env.EMAIL_OUTBOX_DIR ?? "./.test-outbox", { recursive: true, force: true });
}
