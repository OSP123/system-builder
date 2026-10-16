import type { ArticleCategory } from "@prisma/client";
import { db } from "./db";

// Public read queries: only ever return published content.

export function getPublishedWorlds() {
  return db.world.findMany({
    where: { published: true },
    orderBy: { name: "asc" },
    include: { coverImage: true, _count: { select: { articles: { where: { published: true } } } } },
  });
}

export function getPublishedWorld(slug: string) {
  return db.world.findFirst({
    where: { slug, published: true },
    include: { coverImage: true },
  });
}

export function getWorldArticles(worldId: string, category?: ArticleCategory) {
  return db.article.findMany({
    where: { worldId, published: true, ...(category ? { category } : {}) },
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: { id: true, slug: true, title: true, summary: true, category: true, coverImage: true },
  });
}

export function getPublishedArticle(worldId: string, slug: string) {
  return db.article.findFirst({
    where: { worldId, slug, published: true },
    include: {
      coverImage: true,
      system: { select: { slug: true, name: true, published: true } },
      planet: { select: { slug: true, name: true, published: true, system: { select: { slug: true } } } },
    },
  });
}

export function getWorldSystems(worldId: string) {
  return db.starSystem.findMany({
    where: { worldId, published: true },
    orderBy: { name: "asc" },
    include: { planets: { where: { published: true }, orderBy: { orbitIndex: "asc" }, select: { slug: true, name: true, classification: true } } },
  });
}

export function getPublishedSystem(worldId: string, slug: string) {
  return db.starSystem.findFirst({
    where: { worldId, slug, published: true },
    include: {
      backdropImage: { select: { key: true } },
      planets: { where: { published: true }, orderBy: { orbitIndex: "asc" }, include: { coverImage: true } },
      articles: { where: { published: true, planetId: null }, select: { slug: true, title: true, category: true } },
    },
  });
}

export function getPublishedPlanet(worldId: string, systemSlug: string, planetSlug: string) {
  return db.planet.findFirst({
    where: { slug: planetSlug, published: true, system: { slug: systemSlug, worldId, published: true } },
    include: {
      coverImage: true,
      system: { select: { name: true, slug: true, theme: true, backdropImage: { select: { key: true } } } },
      articles: { where: { published: true }, select: { slug: true, title: true, category: true } },
      regions: {
        where: { published: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { slug: true, name: true, kind: true, summary: true, lat: true, lng: true },
      },
    },
  });
}

// ---------- Codex sections ----------

export function getWorldCharacters(worldId: string) {
  return db.character.findMany({
    where: { worldId, published: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, title: true, faction: true, status: true, summary: true, portraitImage: true },
  });
}

export function getPublishedCharacter(worldId: string, slug: string) {
  return db.character.findFirst({
    where: { worldId, slug, published: true },
    include: {
      portraitImage: true,
      homeworld: { select: { slug: true, name: true, published: true, system: { select: { slug: true, published: true } } } },
      narratives: { where: { published: true }, select: { slug: true, title: true, subtitle: true }, orderBy: { createdAt: "desc" } },
    },
  });
}

export function getWorldUnits(worldId: string) {
  return db.unit.findMany({
    where: { worldId, published: true },
    orderBy: [{ slot: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export function getPublishedUnit(worldId: string, slug: string) {
  return db.unit.findFirst({ where: { worldId, slug, published: true }, include: { image: true } });
}

export function getWorldNarratives(worldId: string) {
  return db.narrative.findMany({
    where: { worldId, published: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, title: true, subtitle: true, summary: true, epigraph: true, coverImage: true },
  });
}

export function getPublishedNarrative(worldId: string, slug: string) {
  return db.narrative.findFirst({
    where: { worldId, slug, published: true },
    include: {
      coverImage: true,
      planet: { select: { slug: true, name: true, published: true, system: { select: { slug: true, published: true } } } },
      characters: {
        where: { published: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { slug: true, name: true, title: true, portraitImage: true },
      },
    },
  });
}

export function getPublishedRegion(worldId: string, systemSlug: string, planetSlug: string, regionSlug: string) {
  return db.region.findFirst({
    where: {
      slug: regionSlug,
      published: true,
      planet: { slug: planetSlug, published: true, system: { slug: systemSlug, worldId, published: true } },
    },
    include: {
      planet: {
        select: {
          name: true,
          slug: true,
          system: { select: { name: true, slug: true, theme: true, backdropImage: { select: { key: true } } } },
          regions: { where: { published: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { slug: true, name: true } },
        },
      },
    },
  });
}
