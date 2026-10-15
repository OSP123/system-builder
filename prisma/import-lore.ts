/**
 * Imports Sons-of-Cerulean-lore.md into the "cerulean" world: one article per
 * section, plus the Cerulean star system and planet. Run after db:seed.
 *
 * Existing records are left alone so CMS edits are never clobbered; pass
 * --force to overwrite them from the file.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { CERULEAN_CHARACTERS, CERULEAN_SECTIONS, CERULEAN_STUBS, parseLoreSections } from "../src/lib/lore-import";

const db = new PrismaClient();
const force = process.argv.includes("--force");
const SOURCE = "Sons-of-Cerulean-lore.md";

async function main() {
  const world = await db.world.findUnique({ where: { slug: "cerulean" } });
  if (!world) throw new Error('World "cerulean" not found. Run `npm run db:seed` first.');

  const { preamble, sections } = parseLoreSections(readFileSync(SOURCE, "utf8"), CERULEAN_SECTIONS);
  const location = preamble.match(/^Location:\s*(.+)$/m)?.[1]?.trim();

  const system = await db.starSystem.upsert({
    where: { worldId_slug: { worldId: world.id, slug: "cerulean" } },
    update: {},
    create: {
      worldId: world.id,
      slug: "cerulean",
      name: "Cerulean",
      authorId: world.ownerId,
      segmentum: "Orpheus Sector",
      description: location ? `**Location:** ${location}` : null,
      published: true,
    },
  });

  const planet = await db.planet.upsert({
    where: { systemId_slug: { systemId: system.id, slug: "cerulean" } },
    update: {},
    create: {
      systemId: system.id,
      slug: "cerulean",
      name: "Cerulean",
      authorId: world.ownerId,
      classification: "Death World",
      orbitIndex: 1,
      description: [
        location && `**Location:** ${location}`,
        "Named *makil* by the Aeldari. The human colonists named the planet “Cerulean”, for its large, pristine blue oceans.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      published: true,
    },
  });

  // Place Cerulean on the galaxy map: southern rim, Segmentum Tempestus, due south of Terra.
  // Only while the position is unset, or still the earlier default from before the map's
  // positions were corrected to the lore; a position chosen in the CMS is never moved.
  const unset = system.x === 0 && system.y === 0 && system.z === 0;
  const oldDefault = system.x === -6_000 && system.y === 300 && system.z === 44_000;
  if (unset || oldDefault) {
    await db.starSystem.update({ where: { id: system.id }, data: { x: -12_000, y: 300, z: 46_000 } });
    console.log("Placed the Cerulean system on the galaxy map (Segmentum Tempestus).");
  }
  // "Large, pristine blue oceans" with floating island continents, unless a look was already chosen.
  if (planet.genParams === null) {
    await db.planet.update({
      where: { id: planet.id },
      data: {
        genParams: {
          water: 0.9,
          clouds: 0.35,
          ice: 0.12,
          detail: 2.4,
          atmosphere: "#6fb6e8",
          palette: { deep: "#0a3a6b", shallow: "#3aa0d4", low: "#3a5a2a", mid: "#4a6234", high: "#66704a" },
        },
      },
    });
    console.log("Gave the planet Cerulean its ocean-world look.");
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const s of sections) {
    const data = {
      title: s.title,
      category: s.category,
      summary: s.summary ?? null,
      body: s.body,
      published: s.published,
      systemId: system.id,
      planetId: planet.id,
      tags: ["cerulean"],
    };
    const existing = await db.article.findUnique({ where: { worldId_slug: { worldId: world.id, slug: s.slug } } });
    if (!existing) {
      await db.article.create({ data: { ...data, slug: s.slug, worldId: world.id, authorId: world.ownerId } });
      created++;
    } else if (force) {
      await db.article.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      skipped++;
    }
  }

  // Draft stubs: create-only, even with --force, so filled-in pages are never wiped.
  let stubs = 0;
  for (const stub of CERULEAN_STUBS) {
    const exists = await db.article.findUnique({ where: { worldId_slug: { worldId: world.id, slug: stub.slug } } });
    if (exists) continue;
    await db.article.create({
      data: { ...stub, worldId: world.id, authorId: world.ownerId, body: "", published: false, planetId: planet.id, systemId: system.id, tags: ["cerulean"] },
    });
    stubs++;
  }

  // Characters: create-once drafts. If an older CHARACTER article stub exists,
  // carry its summary/body over; delete it only when it is still an empty draft.
  let characters = 0;
  for (const c of CERULEAN_CHARACTERS) {
    const old = await db.article.findUnique({ where: { worldId_slug: { worldId: world.id, slug: c.slug } } });
    const exists = await db.character.findUnique({ where: { worldId_slug: { worldId: world.id, slug: c.slug } } });
    if (!exists) {
      await db.character.create({
        data: {
          worldId: world.id,
          authorId: world.ownerId,
          slug: c.slug,
          name: c.name,
          title: c.title,
          faction: c.faction,
          sortOrder: c.sortOrder,
          summary: old?.summary ?? c.summary,
          body: old?.body ?? "",
          published: false,
          homeworldId: planet.id,
        },
      });
      characters++;
    }
    if (old && old.category === "CHARACTER" && !old.published && old.body.trim() === "") {
      await db.article.delete({ where: { id: old.id } });
    } else if (old && old.category === "CHARACTER") {
      console.log(`Kept article "${old.title}" (it has content or is published); its text was copied to the character.`);
    }
  }
  console.log(`Characters: ${characters} created.`);

  // Fill the world overview only if it hasn't been written in the CMS yet.
  if (!world.summary || force) {
    const toc = sections
      .filter((s) => s.published)
      .map((s) => `- [${s.title}](/w/${world.slug}/lore/${s.slug})${s.summary ? ` — ${s.summary}` : ""}`)
      .join("\n");
    await db.world.update({
      where: { id: world.id },
      data: {
        tagline: world.tagline || "A world of pristine blue oceans in the Orpheus Sector",
        summary: [location && `**Location:** ${location}`, "## The Chronicles of Cerulean", toc].filter(Boolean).join("\n\n"),
        published: true,
      },
    });
  }

  console.log(`Draft stubs: ${stubs} created.`);
  console.log(`Lore import: ${created} created, ${updated} updated, ${skipped} skipped (already exist${force ? "" : "; use --force to overwrite"}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
