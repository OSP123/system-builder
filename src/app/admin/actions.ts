"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { authenticate, createSession, destroySession, requireUser } from "@/lib/auth";
import * as content from "@/lib/content";
import { db } from "@/lib/db";
import { deleteImage } from "@/lib/storage";
import {
  articleSchema,
  flattenErrors,
  formToObject,
  loginSchema,
  planetSchema,
  systemSchema,
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
    throw e;
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
  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media?.worldId) return;
  await content.assertCanEditWorld(user, media.worldId);
  const alt = String(form.get("alt") ?? "").trim().slice(0, 300) || null;
  await db.media.update({ where: { id: mediaId }, data: { alt } });
  revalidatePath(`/admin/worlds/${media.worldId}/media`);
}

export async function deleteMedia(mediaId: string) {
  const user = await requireUser();
  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media?.worldId) return;
  await content.assertCanEditWorld(user, media.worldId);
  await db.media.delete({ where: { id: mediaId } });
  await deleteImage(media.key);
  revalidatePath(`/admin/worlds/${media.worldId}/media`);
}
