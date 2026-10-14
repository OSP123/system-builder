"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { authenticate, createSession, destroySession, requireAdmin, requireUser } from "@/lib/auth";
import * as codex from "@/lib/codex-content";
import * as content from "@/lib/content";
import { db } from "@/lib/db";
import { deleteImage } from "@/lib/storage";
import * as users from "@/lib/users";
import {
  articleSchema,
  changePasswordSchema,
  characterSchema,
  flattenErrors,
  formToObject,
  loginSchema,
  narrativeSchema,
  newUserSchema,
  planetSchema,
  resetPasswordSchema,
  systemSchema,
  unitSchema,
  updateUserSchema,
  worldSchema,
  type FieldErrors,
} from "@/lib/validation";

export type ActionState = { errors?: FieldErrors; saved?: boolean };

/**
 * Validate the form, run the mutation, and turn known failures into field
 * errors. Returns the mutation result on success, or an ActionState on failure.
 */
async function mutate<S extends z.ZodType, R>(
  schema: S,
  form: FormData,
  fn: (user: Awaited<ReturnType<typeof requireUser>>, data: z.output<S>) => Promise<R>,
): Promise<{ ok: true; result: R } | { ok: false; state: ActionState }> {
  const user = await requireUser();
  const parsed = schema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, state: { errors: flattenErrors(parsed.error) } };
  try {
    return { ok: true, result: await fn(user, parsed.data) };
  } catch (e) {
    if (e instanceof content.ContentError) return { ok: false, state: { errors: { [e.field]: e.message } } };
    if (e instanceof content.ForbiddenError) return { ok: false, state: { errors: { _form: e.message } } };
    // Let Next.js control-flow errors (redirect, notFound) through; report anything else
    // as a failed save so the editor keeps the user's unsaved text.
    unstable_rethrow(e);
    console.error("Save failed", e);
    return { ok: false, state: { errors: { _form: "The cogitator faltered while saving." } } };
  }
}

// ---------- Auth ----------

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(form));
  if (!parsed.success) return { errors: { _form: "Enter your email and password" } };
  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) return { errors: { _form: "Invalid email or password" } };
  await createSession({ userId: user.id, role: user.role });
  const next = String(form.get("next") ?? "");
  // Only allow local admin redirects, never an open redirect.
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

// ---------- Worlds ----------

export async function createWorld(_prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(worldSchema, form, content.createWorld);
  if (!r.ok) return r.state;
  redirect(`/admin/worlds/${r.result.id}`);
}

export async function updateWorld(worldId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(worldSchema, form, (u, d) => content.updateWorld(u, worldId, d));
  if (!r.ok) return r.state;
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function deleteWorld(worldId: string) {
  const user = await requireUser();
  await content.deleteWorld(user, worldId);
  redirect("/admin");
}

// ---------- Articles ----------

export async function createArticle(worldId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(articleSchema, form, (u, d) => content.createArticle(u, worldId, d));
  if (!r.ok) return r.state;
  redirect(`/admin/worlds/${worldId}/articles/${r.result.id}?created=1`);
}

export async function updateArticle(articleId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(articleSchema, form, (u, d) => content.updateArticle(u, articleId, d));
  if (!r.ok) return r.state;
  revalidatePath("/w", "layout");
  return { saved: true };
}

export async function deleteArticle(worldId: string, articleId: string) {
  const user = await requireUser();
  await content.deleteArticle(user, articleId);
  redirect(`/admin/worlds/${worldId}/articles`);
}

// ---------- Star systems ----------

export async function createSystem(worldId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(systemSchema, form, (u, d) => content.createSystem(u, worldId, d));
  if (!r.ok) return r.state;
  redirect(`/admin/worlds/${worldId}/systems/${r.result.id}?created=1`);
}

export async function updateSystem(systemId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(systemSchema, form, (u, d) => content.updateSystem(u, systemId, d));
  if (!r.ok) return r.state;
  revalidatePath("/w", "layout");
  return { saved: true };
}

export async function deleteSystem(worldId: string, systemId: string) {
  const user = await requireUser();
  await content.deleteSystem(user, systemId);
  redirect(`/admin/worlds/${worldId}/systems`);
}

// ---------- Planets ----------

export async function createPlanet(
  worldId: string,
  systemId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const r = await mutate(planetSchema, form, (u, d) => content.createPlanet(u, systemId, d));
  if (!r.ok) return r.state;
  redirect(`/admin/worlds/${worldId}/systems/${systemId}/planets/${r.result.id}?created=1`);
}

export async function updatePlanet(planetId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(planetSchema, form, (u, d) => content.updatePlanet(u, planetId, d));
  if (!r.ok) return r.state;
  revalidatePath("/w", "layout");
  return { saved: true };
}

export async function deletePlanet(worldId: string, systemId: string, planetId: string) {
  const user = await requireUser();
  await content.deletePlanet(user, planetId);
  redirect(`/admin/worlds/${worldId}/systems/${systemId}`);
}

// ---------- Media ----------

export async function updateMediaAlt(mediaId: string, form: FormData) {
  const user = await requireUser();
  const media = await content.assertCanEditMedia(user, mediaId);
  if (!media) return;
  const alt = String(form.get("alt") ?? "").trim().slice(0, 300) || null;
  await db.media.update({ where: { id: mediaId }, data: { alt } });
  if (media.worldId) revalidatePath(`/admin/worlds/${media.worldId}/media`);
}

export async function deleteMedia(mediaId: string) {
  const user = await requireUser();
  const media = await content.assertCanEditMedia(user, mediaId);
  if (!media) return;
  await db.media.delete({ where: { id: mediaId } });
  await deleteImage(media.key);
  if (media.worldId) revalidatePath(`/admin/worlds/${media.worldId}/media`);
}

// ---------- Characters ----------

export async function createCharacter(worldId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(characterSchema, form, (u, d) => codex.createCharacter(u, worldId, d));
  if (!r.ok) return r.state;
  redirect(`/admin/worlds/${worldId}/characters/${r.result.id}?created=1`);
}

export async function updateCharacter(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(characterSchema, form, (u, d) => codex.updateCharacter(u, id, d));
  if (!r.ok) return r.state;
  revalidatePath("/w", "layout");
  return { saved: true };
}

export async function deleteCharacter(worldId: string, id: string) {
  const user = await requireUser();
  await codex.deleteCharacter(user, id);
  redirect(`/admin/worlds/${worldId}/characters`);
}

// ---------- Army list ----------

export async function createUnit(worldId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(unitSchema, form, (u, d) => codex.createUnit(u, worldId, d));
  if (!r.ok) return r.state;
  redirect(`/admin/worlds/${worldId}/units/${r.result.id}?created=1`);
}

export async function updateUnit(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(unitSchema, form, (u, d) => codex.updateUnit(u, id, d));
  if (!r.ok) return r.state;
  revalidatePath("/w", "layout");
  return { saved: true };
}

export async function deleteUnit(worldId: string, id: string) {
  const user = await requireUser();
  await codex.deleteUnit(user, id);
  redirect(`/admin/worlds/${worldId}/units`);
}

// ---------- Narratives ----------

export async function createNarrative(worldId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(narrativeSchema, form, (u, d) => codex.createNarrative(u, worldId, d));
  if (!r.ok) return r.state;
  redirect(`/admin/worlds/${worldId}/narratives/${r.result.id}?created=1`);
}

export async function updateNarrative(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(narrativeSchema, form, (u, d) => codex.updateNarrative(u, id, d));
  if (!r.ok) return r.state;
  revalidatePath("/w", "layout");
  return { saved: true };
}

export async function deleteNarrative(worldId: string, id: string) {
  const user = await requireUser();
  await codex.deleteNarrative(user, id);
  redirect(`/admin/worlds/${worldId}/narratives`);
}

// ---------- Users (admin only) ----------

export async function createUser(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const r = await mutate(newUserSchema, form, users.createUser);
  if (!r.ok) return r.state;
  redirect(`/admin/users/${r.result.id}?created=1`);
}

export async function updateUser(userId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const r = await mutate(updateUserSchema, form, (u, d) => users.updateUser(u, userId, d));
  if (!r.ok) return r.state;
  revalidatePath("/admin/users");
  return { saved: true };
}

export async function resetUserPassword(userId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const r = await mutate(resetPasswordSchema, form, (u, d) => users.resetPassword(u, userId, d.password));
  return r.ok ? { saved: true } : r.state;
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  try {
    await users.deleteUser(admin, userId);
  } catch (e) {
    // e.g. deleting the last admin: report it on the user's page instead of crashing.
    if (e instanceof content.ContentError) redirect(`/admin/users/${userId}?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect("/admin/users");
}

// ---------- Own account ----------

export async function changePassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const r = await mutate(changePasswordSchema, form, (u, d) => users.changeOwnPassword(u.id, d.currentPassword, d.newPassword));
  return r.ok ? { saved: true } : r.state;
}
