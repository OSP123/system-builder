import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  ContentError,
  ForbiddenError,
  createArticle,
  createPlanet,
  createSystem,
  createWorld,
  deleteWorld,
  updateArticle,
  updateWorld,
} from "@/lib/content";
import { getPublishedArticle, getPublishedPlanet, getPublishedWorlds, getWorldArticles } from "@/lib/queries";
import { articleSchema, planetSchema, systemSchema, worldSchema } from "@/lib/validation";
import { makeUser, resetDb } from "./helpers";

const world = (o: Record<string, unknown> = {}) => worldSchema.parse({ name: "Cerulean", ...o });
const article = (o: Record<string, unknown> = {}) =>
  articleSchema.parse({ title: "The Azure Crusade", category: "BATTLE", body: "# War", ...o });

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("worlds", () => {
  it("creates a world owned by the actor", async () => {
    const u = await makeUser();
    const w = await createWorld(u, world());
    expect(w.ownerId).toBe(u.id);
    expect(w.slug).toBe("cerulean");
  });

  it("reports duplicate slugs as a field error", async () => {
    const u = await makeUser();
    await createWorld(u, world());
    await expect(createWorld(u, world())).rejects.toMatchObject({ field: "slug" });
  });

  it("editors cannot modify someone else's world", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const w = await createWorld(owner, world());
    await expect(updateWorld(other, w.id, world({ name: "Hijacked" }))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(deleteWorld(other, w.id)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("admins can modify any world", async () => {
    const owner = await makeUser();
    const admin = await makeUser("ADMIN");
    const w = await createWorld(owner, world());
    const updated = await updateWorld(admin, w.id, world({ name: "Cerulean Prime", slug: "cerulean" }));
    expect(updated.name).toBe("Cerulean Prime");
  });

  it("deleting a world cascades to its content", async () => {
    const u = await makeUser();
    const w = await createWorld(u, world());
    const s = await createSystem(u, w.id, systemSchema.parse({ name: "Azure" }));
    await createPlanet(u, s.id, planetSchema.parse({ name: "Azure Prime" }));
    await createArticle(u, w.id, article());
    await deleteWorld(u, w.id);
    expect(await db.article.count()).toBe(0);
    expect(await db.planet.count()).toBe(0);
  });
});

describe("articles", () => {
  it("slugs are unique per world, not globally", async () => {
    const u = await makeUser();
    const a = await createWorld(u, world());
    const b = await createWorld(u, world({ name: "Other" }));
    await createArticle(u, a.id, article());
    await expect(createArticle(u, b.id, article())).resolves.toBeTruthy();
    await expect(createArticle(u, a.id, article())).rejects.toBeInstanceOf(ContentError);
  });

  it("cannot link to a system from another world", async () => {
    const u = await makeUser();
    const a = await createWorld(u, world());
    const b = await createWorld(u, world({ name: "Other" }));
    const foreign = await createSystem(u, b.id, systemSchema.parse({ name: "Elsewhere" }));
    await expect(createArticle(u, a.id, article({ systemId: foreign.id }))).rejects.toMatchObject({
      field: "systemId",
    });
  });

  it("editors cannot add articles to someone else's world", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const w = await createWorld(owner, world());
    await expect(createArticle(other, w.id, article())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("updates an article", async () => {
    const u = await makeUser();
    const w = await createWorld(u, world());
    const a = await createArticle(u, w.id, article());
    const updated = await updateArticle(u, a.id, article({ title: "Renamed", slug: a.slug }));
    expect(updated.title).toBe("Renamed");
  });
});

describe("system themes", () => {
  it("stores the theme and rejects a backdrop from another world", async () => {
    const u = await makeUser();
    const a = await createWorld(u, world());
    const b = await createWorld(u, world({ name: "Other" }));
    const foreignImage = await db.media.create({
      data: { key: "a".repeat(24) + ".png", originalName: "x.png", mimeType: "image/png", size: 1, worldId: b.id, uploadedById: u.id },
    });
    await expect(
      createSystem(u, a.id, systemSchema.parse({ name: "Azure", backdropImageId: foreignImage.id })),
    ).rejects.toMatchObject({ field: "backdropImageId" });

    const s = await createSystem(u, a.id, systemSchema.parse({ name: "Azure", themePreset: "warp", themeAccent: "#112233" }));
    expect(s.theme).toMatchObject({ preset: "warp", colors: { accent: "#112233" } });
  });
});

describe("public queries", () => {
  it("hide unpublished worlds and articles", async () => {
    const u = await makeUser();
    const pub = await createWorld(u, world({ published: "on" }));
    await createWorld(u, world({ name: "Draft World" }));
    await createArticle(u, pub.id, article({ published: "on" }));
    await createArticle(u, pub.id, article({ title: "Secret", published: "" }));

    const worlds = await getPublishedWorlds();
    expect(worlds.map((w) => w.name)).toEqual(["Cerulean"]);
    expect(worlds[0]._count.articles).toBe(1);

    const list = await getWorldArticles(pub.id);
    expect(list.map((a) => a.title)).toEqual(["The Azure Crusade"]);
    expect(await getPublishedArticle(pub.id, "secret")).toBeNull();
  });

  it("hides a published planet whose system is unpublished", async () => {
    const u = await makeUser();
    const w = await createWorld(u, world({ published: "on" }));
    const s = await createSystem(u, w.id, systemSchema.parse({ name: "Azure" }));
    await createPlanet(u, s.id, planetSchema.parse({ name: "Azure Prime", published: "on" }));
    expect(await getPublishedPlanet(w.id, "azure", "azure-prime")).toBeNull();
  });

  it("stores and returns planet genParams", async () => {
    const u = await makeUser();
    const w = await createWorld(u, world());
    const s = await createSystem(u, w.id, systemSchema.parse({ name: "Azure", published: "on" }));
    await createPlanet(u, s.id, planetSchema.parse({ name: "Azure Prime", published: "on", genParams: '{"seed":7}' }));
    const p = await getPublishedPlanet(w.id, "azure", "azure-prime");
    expect(p?.genParams).toEqual({ seed: 7 });
  });
});
