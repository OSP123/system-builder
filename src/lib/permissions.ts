/**
 * Who may do what. Pure functions, shared by the server (enforcement) and the
 * CMS screens (what to show). Always pass the actor as loaded from the
 * database, never the role cached in the session cookie.
 *
 * - Admins may do anything.
 * - A world's owner manages the world itself (settings, publishing, deletion).
 * - Anyone may contribute records to a published world, or to one they own.
 * - Only a record's author (or an admin) may edit or delete it, even when
 *   the record sits in someone else's world.
 */

export type Actor = { id: string; role: "ADMIN" | "EDITOR" };

export const isAdmin = (actor: Actor) => actor.role === "ADMIN";

export function canManageWorld(actor: Actor, world: { ownerId: string }) {
  return isAdmin(actor) || world.ownerId === actor.id;
}

export function canContribute(actor: Actor, world: { ownerId: string; published: boolean }) {
  return canManageWorld(actor, world) || world.published;
}

export function canEditRecord(actor: Actor, record: { authorId: string | null }) {
  return isAdmin(actor) || (record.authorId !== null && record.authorId === actor.id);
}

export const ROLE_LABELS: Record<Actor["role"], string> = {
  ADMIN: "Admin",
  EDITOR: "Contributor",
};
