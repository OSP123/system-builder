import { afterAll, beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createCharacter, deleteCharacter, updateCharacter } from "@/lib/codex-content";
import {
  assertCanEditMedia,
  createArticle,
  createPlanet,
  createSystem,
  createWorld,
  deleteArticle,
  deleteSystem,
  ForbiddenError,
  updateArticle,
  updateWorld,
} from "@/lib/content";
import { canContribute, canEditRecord, canManageWorld } from "@/lib/permissions";
import { changeOwnPassword, createUser, deleteUser, updateUser } from "@/lib/users";
import {
  articleSchema,
  characterSchema,
  newUserSchema,
  planetSchema,
  systemSchema,
  updateUserSchema,
  worldSchema,
} from "@/lib/validation";
import { makeUser, resetDb } from "./helpers";

const article = (title = "The Azure Crusade", o: Record<string, unknown> = {}) =>
  articleSchema.parse({ title, category: "HISTORY", ...o });

describe("permission rules (pure)", () => {
  const admin = { id: "a", role: "ADMIN" as const };
  const ed = { id: "e", role: "EDITOR" as const };
  it("covers the matrix", () => {
    expect(canManageWorld(admin, { ownerId: "x" })).toBe(true);
    expect(canManageWorld(ed, { ownerId: "x" })).toBe(false);
    expect(canManageWorld(ed, { ownerId: "e" })).toBe(true);
    expect(canContribute(ed, { ownerId: "x", published: true })).toBe(true);
    expect(canContribute(ed, { ownerId: "x", published: false })).toBe(false);
    expect(canEditRecord(ed, { authorId: "e" })).toBe(true);
    expect(canEditRecord(ed, { authorId: "x" })).toBe(false);
    expect(canEditRecord(ed, { authorId: null })).toBe(false);
    expect(canEditRecord(admin, { authorId: null })).toBe(true);
  });
});

describe("contributors", () => {
  beforeEach(resetDb);
  afterAll(() => db.$disconnect());

  async function setup() {
    const admin = await makeUser("ADMIN");
    const alice = await makeUser("EDITOR");
    const bob = await makeUser("EDITOR");
    const cerulean = await createWorld(admin, worldSchema.parse({ name: "Cerulean", published: "on" }));
    const hidden = await createWorld(admin, worldSchema.parse({ name: "Hidden" }));
    return { admin, alice, bob, cerulean, hidden };
  }

  it("can add records to a published world but not an unpublished one", async () => {
    const { alice, cerulean, hidden } = await setup();
    const a = await createArticle(alice, cerulean.id, article());
    expect(a.authorId).toBe(alice.id);
    await expect(createArticle(alice, hidden.id, article())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("can edit and delete their own records only; admins can edit anyone's", async () => {
    const { admin, alice, bob, cerulean } = await setup();
    const a = await createArticle(alice, cerulean.id, article());
    await expect(updateArticle(bob, a.id, article("Hijacked", { slug: a.slug }))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(deleteArticle(bob, a.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(updateArticle(alice, a.id, article("Renamed", { slug: a.slug }))).resolves.toMatchObject({ title: "Renamed" });
    await expect(updateArticle(admin, a.id, article("Admin edit", { slug: a.slug }))).resolves.toMatchObject({ title: "Admin edit" });
    await deleteArticle(alice, a.id);
    expect(await db.article.count()).toBe(0);
  });

  it("can't touch records the admin wrote, even in a shared world", async () => {
    const { admin, alice, cerulean } = await setup();
    const hesaar = await createCharacter(admin, cerulean.id, characterSchema.parse({ name: "Hesaar" }));
    await expect(updateCharacter(alice, hesaar.id, characterSchema.parse({ name: "Hacked", slug: "hesaar" }))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(deleteCharacter(alice, hesaar.id)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("a world owner who isn't an admin can't edit contributors' records in their world", async () => {
    const { alice, bob } = await setup();
    const alicesWorld = await createWorld(alice, worldSchema.parse({ name: "Alice World", published: "on" }));
    const bobs = await createArticle(bob, alicesWorld.id, article());
    await expect(deleteArticle(alice, bobs.id)).rejects.toBeInstanceOf(ForbiddenError);
    // ...but does manage the world's own settings
    await expect(updateWorld(alice, alicesWorld.id, worldSchema.parse({ name: "Alice's World", slug: "alice-world" }))).resolves.toBeTruthy();
    await expect(updateWorld(bob, alicesWorld.id, worldSchema.parse({ name: "Bob's now", slug: "alice-world" }))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("can add planets to others' systems, but not delete a system holding others' planets", async () => {
    const { admin, alice, bob, cerulean } = await setup();
    const sys = await createSystem(alice, cerulean.id, systemSchema.parse({ name: "Azure" }));
    await createPlanet(bob, sys.id, planetSchema.parse({ name: "Bob's Rock" }));
    await expect(deleteSystem(alice, sys.id)).rejects.toThrow(/planets other contributors/);
    await deleteSystem(admin, sys.id);
    expect(await db.planet.count()).toBe(0);
  });

  it("only the uploader or an admin may change an image", async () => {
    const { admin, alice, bob, cerulean } = await setup();
    const m = await db.media.create({
      data: { key: "b".repeat(24) + ".png", originalName: "x.png", mimeType: "image/png", size: 1, worldId: cerulean.id, uploadedById: alice.id },
    });
    await expect(assertCanEditMedia(bob, m.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(assertCanEditMedia(alice, m.id)).resolves.toBeTruthy();
    await expect(assertCanEditMedia(admin, m.id)).resolves.toBeTruthy();
  });
});

describe("user management", () => {
  beforeEach(resetDb);

  it("only admins create users; emails are unique", async () => {
    const admin = await makeUser("ADMIN");
    const ed = await makeUser("EDITOR");
    const input = newUserSchema.parse({ email: "New@Test.dev", password: "long-enough-pw" });
    await expect(createUser(ed, input)).rejects.toBeInstanceOf(ForbiddenError);
    const u = await createUser(admin, input);
    expect(u).toMatchObject({ email: "new@test.dev", role: "EDITOR" });
    expect(await bcrypt.compare("long-enough-pw", u.passwordHash)).toBe(true);
    await expect(createUser(admin, input)).rejects.toMatchObject({ field: "email" });
  });

  it("rejects short passwords", () => {
    expect(newUserSchema.safeParse({ email: "a@b.dev", password: "short" }).success).toBe(false);
  });

  it("protects against admin lock-out", async () => {
    const admin = await makeUser("ADMIN");
    await expect(updateUser(admin, admin.id, updateUserSchema.parse({ role: "EDITOR" }))).rejects.toThrow(/your own admin/);
    await expect(updateUser(admin, admin.id, updateUserSchema.parse({ role: "ADMIN", disabled: "on" }))).rejects.toThrow(/your own admin/);
    await expect(deleteUser(admin, admin.id)).rejects.toThrow(/your own account/);

    const second = await makeUser("ADMIN");
    await expect(updateUser(admin, second.id, updateUserSchema.parse({ role: "EDITOR" }))).resolves.toMatchObject({ role: "EDITOR" });
    // `admin` is now the last active admin; nobody else can be used to remove them
    const third = await makeUser("ADMIN");
    await updateUser(admin, third.id, updateUserSchema.parse({ role: "ADMIN", disabled: "on" }));
    expect(await db.user.count({ where: { role: "ADMIN", disabled: false } })).toBe(1);
  });

  it("deleting a user hands their worlds, records and images to the admin", async () => {
    const admin = await makeUser("ADMIN");
    const alice = await makeUser("EDITOR");
    const shared = await createWorld(admin, worldSchema.parse({ name: "Cerulean", published: "on" }));
    const own = await createWorld(alice, worldSchema.parse({ name: "Alice World" }));
    await createArticle(alice, shared.id, article());
    await createCharacter(alice, shared.id, characterSchema.parse({ name: "Syl" }));
    await db.media.create({
      data: { key: "c".repeat(24) + ".png", originalName: "x.png", mimeType: "image/png", size: 1, worldId: shared.id, uploadedById: alice.id },
    });

    await deleteUser(admin, alice.id);

    expect(await db.user.findUnique({ where: { id: alice.id } })).toBeNull();
    expect((await db.world.findUnique({ where: { id: own.id } }))?.ownerId).toBe(admin.id);
    expect(await db.article.count({ where: { authorId: admin.id } })).toBe(1);
    expect(await db.character.count({ where: { authorId: admin.id } })).toBe(1);
    expect(await db.media.count({ where: { uploadedById: admin.id } })).toBe(1);
  });

  it("users change their own password only with the current one", async () => {
    const admin = await makeUser("ADMIN");
    const u = await createUser(admin, newUserSchema.parse({ email: "c@test.dev", password: "first-password" }));
    await expect(changeOwnPassword(u.id, "wrong-password", "second-password")).rejects.toMatchObject({ field: "currentPassword" });
    await changeOwnPassword(u.id, "first-password", "second-password");
    const after = await db.user.findUnique({ where: { id: u.id } });
    expect(await bcrypt.compare("second-password", after!.passwordHash)).toBe(true);
  });
});
