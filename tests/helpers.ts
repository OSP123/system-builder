import { db } from "@/lib/db";

export async function resetDb() {
  await db.$executeRawUnsafe(
    'TRUNCATE "Region", "PasswordResetToken", "Narrative", "Character", "Unit", "Article", "Planet", "StarSystem", "World", "Media", "Recording", "User" RESTART IDENTITY CASCADE',
  );
}

let n = 0;
export async function makeUser(role: "ADMIN" | "EDITOR" = "EDITOR") {
  n += 1;
  return db.user.create({ data: { email: `user${n}-${Date.now()}@test.dev`, passwordHash: "x", role } });
}
