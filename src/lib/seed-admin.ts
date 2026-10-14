import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

/**
 * Makes sure the configured admin account exists.
 *
 * The password from ADMIN_PASSWORD is only applied when the account is first
 * created, or when ADMIN_RESET_PASSWORD=true (an explicit recovery switch).
 * The seed runs on every boot in production, so applying it unconditionally
 * would silently undo any password change made in the app.
 */
export async function ensureAdmin(
  db: PrismaClient,
  env: { ADMIN_EMAIL?: string; ADMIN_PASSWORD?: string; ADMIN_RESET_PASSWORD?: string },
) {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("Set ADMIN_EMAIL");
  const password = env.ADMIN_PASSWORD;
  const forceReset = env.ADMIN_RESET_PASSWORD === "true";

  const existing = await db.user.findUnique({ where: { email } });
  const needsPassword = !existing || forceReset;
  if (needsPassword) {
    if (!password) throw new Error("Set ADMIN_PASSWORD to create the admin account or reset its password");
    if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters");
  }

  if (!existing) {
    const admin = await db.user.create({
      data: { email, role: "ADMIN", name: "Archivist", passwordHash: await bcrypt.hash(password!, 12) },
    });
    return { admin, action: "created" as const };
  }

  // Always keep this account an active admin, so a mistaken demotion can be undone by redeploying.
  const admin = await db.user.update({
    where: { id: existing.id },
    data: {
      role: "ADMIN",
      disabled: false,
      ...(forceReset ? { passwordHash: await bcrypt.hash(password!, 12), passwordChangedAt: new Date() } : {}),
    },
  });
  return { admin, action: forceReset ? ("password-reset" as const) : ("unchanged" as const) };
}
