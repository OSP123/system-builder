import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { ContentError, ForbiddenError } from "./content";
import { db } from "./db";
import { isAdmin, type Actor } from "./permissions";
import type { newUserSchema, updateUserSchema } from "./validation";

/** User management. Everything here except changeOwnPassword is admin-only. */

const BCRYPT_ROUNDS = 12;

function assertAdmin(actor: Actor) {
  if (!isAdmin(actor)) throw new ForbiddenError("You do not have permission to manage users");
}

/** Throws if removing admin rights from `userId` would leave no active admin. */
async function assertAnotherAdminRemains(userId: string) {
  const others = await db.user.count({ where: { role: "ADMIN", disabled: false, NOT: { id: userId } } });
  if (others === 0) throw new ContentError("This is the last active admin. Promote someone else first.");
}

export async function createUser(actor: Actor, data: z.output<typeof newUserSchema>) {
  assertAdmin(actor);
  try {
    return await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        passwordHash: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ContentError("A user with that email already exists", "email");
    }
    throw e;
  }
}

export async function updateUser(actor: Actor, userId: string, data: z.output<typeof updateUserSchema>) {
  assertAdmin(actor);
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new ContentError("User not found");
  const losesAdmin = target.role === "ADMIN" && !target.disabled && (data.role !== "ADMIN" || data.disabled);
  if (losesAdmin) {
    if (userId === actor.id) throw new ContentError("You can't remove your own admin access or disable yourself.");
    await assertAnotherAdminRemains(userId);
  }
  return db.user.update({ where: { id: userId }, data });
}

export async function resetPassword(actor: Actor, userId: string, password: string) {
  assertAdmin(actor);
  // Signs the user out everywhere.
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS), passwordChangedAt: new Date() },
  });
}

/**
 * Deletes a user. Their worlds, records and uploads are reassigned to the
 * admin performing the deletion, so no content is lost or left without an owner.
 */
export async function deleteUser(actor: Actor, userId: string) {
  assertAdmin(actor);
  if (userId === actor.id) throw new ContentError("You can't delete your own account.");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return;
  if (target.role === "ADMIN" && !target.disabled) await assertAnotherAdminRemains(userId);

  const to = { authorId: actor.id };
  const from = { where: { authorId: userId }, data: to };
  await db.$transaction([
    db.world.updateMany({ where: { ownerId: userId }, data: { ownerId: actor.id } }),
    db.media.updateMany({ where: { uploadedById: userId }, data: { uploadedById: actor.id } }),
    db.article.updateMany(from),
    db.starSystem.updateMany(from),
    db.planet.updateMany(from),
    db.character.updateMany(from),
    db.unit.updateMany(from),
    db.narrative.updateMany(from),
    db.user.delete({ where: { id: userId } }),
  ]);
}

export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new ContentError("Current password is incorrect", "currentPassword");
  }
  // Signs out other sessions; the caller re-issues the current one.
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), passwordChangedAt: new Date() },
  });
}

/** Counts of what each user has authored, for the Users page. */
export async function listUsersWithCounts() {
  return db.user.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      disabled: true,
      createdAt: true,
      _count: { select: { worlds: true, articles: true, characters: true, units: true, narratives: true, systems: true, planets: true } },
    },
  });
}
