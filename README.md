# Archivum

A lore archive and CMS for custom worlds in the Warhammer 40,000 universe. The first world is Cerulean, and other creators can add their own. The app's name and tagline live in `src/lib/site.ts`.

- **Public site:** worlds → lore records by category → star systems → planets.
- **Admin CMS** (`/admin`): Markdown editor with live preview, image library with uploads, cover images, draft/published states.
- **Built to grow into:** an interactive star map (systems already store `x/y/z` coordinates) and procedurally generated 3D planets (planets already store free-form `genParams` JSON).

## Stack

Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS 4 · Prisma 6 + PostgreSQL 16 · JWT session cookies (jose) + bcrypt · Vitest · Playwright

## Getting started

```bash
npm install
npm run db:up            # Postgres in Docker on localhost:5433 (also creates cerulean_test)
cp .env.example .env     # then fill in AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:migrate       # apply migrations
npm run db:seed          # create the admin account + an empty "Cerulean" world
npm run db:import-lore   # load Sons-of-Cerulean-lore.md into the Cerulean world (skips existing records; --force overwrites)
npm run dev              # http://localhost:3000, admin at /admin
```

`ADMIN_PASSWORD` only applies when the admin account is first created. After that, change it in the app (Account), or set `ADMIN_RESET_PASSWORD=true` and run `npm run db:seed` to force it back to `ADMIN_PASSWORD`.

## Passwords

- **Forgot password:** "Forgot password?" on the login page emails a one-time link that expires after an hour. It responds identically whether or not the email has an account, and sends at most 3 links per account per hour. Only a hash of each link is stored.
- **Admins** can reset any user's password from Users. **Everyone** can change their own under Account.
- Any password change signs that user out on every other device.
- Email goes through [Resend](https://resend.com) when `RESEND_API_KEY` is set; otherwise it's printed to the server log. Until a domain is verified in Resend, it can only deliver to the Resend account's own address.

## Your emblem

Put your symbol at `public/emblem.svg` (or `.png`, `.webp`, `.jpg`, `.avif`). It shows in the header, the home and world heroes, the login page and the CMS. With no file present, nothing is drawn. `npm run dev` picks it up immediately; a production server (`npm start`) must be restarted after adding it. SVG or a PNG with a transparent background looks best.

## Deploying to Render

The site runs as a Render web service. Its database and uploaded images live in **Supabase** (Postgres plus Storage), so nothing depends on Render's expiring free database or its wiped-on-deploy disk.

1. Create a Supabase project. You need:
   - `DATABASE_URL`: **Connect → Session pooler** (port 5432, IPv4), with the database password. Don't use the direct connection (IPv6-only, which Render can't reach) or the transaction pooler (port 6543; it needs `?pgbouncer=true` for Prisma).
   - `SUPABASE_URL` (`https://<project>.supabase.co`) and `SUPABASE_SECRET_KEY` (**Project Settings → API Keys → Secret keys**, `sb_secret_…`; not the publishable key). The app doesn't use the publishable key.
2. In Render, create the web service from this repo (or **New → Blueprint** with `render.yaml`) and set those three plus `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `AUTH_SECRET` (`openssl rand -base64 32`; a Blueprint generates it). The start command is `npm run start:render`.
3. On every boot the service runs migrations, creates the public `media` storage bucket if it's missing (`npm run storage:setup`), runs the admin seed (which creates the admin account if it's missing but never changes an existing password unless `ADMIN_RESET_PASSWORD=true`) and the lore and world imports, then starts. Render health-checks `/api/health`.
4. For password-reset emails, set `RESEND_API_KEY` and `EMAIL_FROM`.

Before anything else, the start command runs a configuration check (`npm run check-env`). It stops the boot with a readable list if a required setting is missing or malformed (`DATABASE_URL`, `AUTH_SECRET` of 32+ characters, `ADMIN_EMAIL`, a publishable key in place of the secret one, Supabase's direct or unflagged transaction-pooler URL), and logs warnings for optional ones (Resend, `APP_URL`, uploads on local disk). Render keeps the previous version running when a boot fails.

Uploads go to Supabase Storage whenever `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set, and to `UPLOAD_DIR` on local disk otherwise (development and tests). Pages always link `/media/<key>`; in production that redirects to the file's public Supabase URL.

The free Render web service sleeps after 15 idle minutes, so the first visit afterwards takes about a minute. A free Supabase project pauses after a week without activity; upgrade it to Pro once people rely on the site.

To use your emblem in production, commit it to `public/`.

## Characters, Army List and Narratives

Three codex-style sections, presented like the 3rd edition rulebook: printed pages, black banners, Caslon text and black-header statlines.

- **Characters** (`/w/<world>/characters`): Dramatis Personae, ordered by an importance number. Each has a title, faction, status, portrait, quote, optional statline (3rd edition characteristics, or 11th edition M/T/Sv/Inv/W/Ld/OC shown in the same style), wargear, special rules, biography and homeworld.
- **Army List** (`/w/<world>/units`): units grouped by Force Organisation slot, each with points, squad composition, model and/or vehicle profiles, wargear, options, special rules and background.
- **Narratives** (`/w/<world>/narratives`): stories with an epigraph, cover art, featured characters and a setting. `##` headings become chapters in a table of contents.

Each section has its own tab in the CMS. Shapes and parsing live in `src/lib/codex.ts`; mutations live in `src/lib/codex-content.ts`.

## Galaxy map

`/galaxy` is a 3D map of the Milky Way in the 41st millennium, shared by every published world (filter by world, colour-coded). Three levels:

- **Galaxy:** a procedurally generated barred spiral (about 80,000 stars), with the Segmenta, Holy Terra, the Astronomican's reach and landmarks (Eye of Terror, Cadia, Maelstrom, Baal, Ultramar, Ghoul Stars, Hadex Anomaly). The Great Rift is a toggle, off by default (it opens at the very end of M41).
- **System:** the star, coloured and sized from its star type, with the published planets orbiting at their orbital positions.
- **Planet:** a rotating procedural globe.

The address bar tracks the level (`/galaxy?system=…&planet=…`), so links can be shared and Back works. A systems index in the side panel covers keyboard, screen-reader and no-WebGL use. Motion is reduced when the visitor's device asks for it.

**Coordinates** on a star system are light-years from the galactic core: +X east, +Z south (map north is −Z), +Y above the plane. The core lies in Ultima Segmentum, east of Sol, so Holy Terra is at −18,000, 0, 5,000; the galaxy is about 50,000 ly in radius. The Great Rift runs from the Eye of Terror (north-west) to the Hadex Anomaly (east), with Terra and Ultramar on the Imperium Sanctus side and Baal in the Imperium Nihilus. The CMS shows which Segmentum a position falls in as you type. Landmark, Segmentum and Rift positions are approximate and live in `src/lib/galaxy/coords.ts`.

**Planet looks** come from the classification (Hive, Forge, Agri, Death, Ocean, Ice, Desert, Daemon, Dead, Shrine…). A planet's *Generator parameters* JSON overrides any of: `seed`, `water`, `clouds`, `ice`, `lights`, `lava` (all 0–1), `detail`, `size`, `atmosphere`, `atmosphereStrength`, `cloudColor`, `lightsColor`, and `palette` (`deep`, `shallow`, `low`, `mid`, `high`, `peak` as `#rrggbb`). For example: `{"water": 0.9, "clouds": 0.3, "palette": {"deep": "#0a3a6b"}}`.

## Planet regions

Planets can have **regions**, such as theatres of war or hive cities. Each has a kind, a description and a terrain note, a latitude and longitude, and a list of sectors. A sector can carry a points level and a polygon on an 800×500 tactical map. Region pages draw that map auspex-style; on the galaxy map, regions are markers on the planet's globe. Add them from a planet's page in the CMS.

A planet can also wrap a **globe texture** around itself instead of the generated surface: upload one with the planet's *Globe texture* picker, or point `genParams.texture` at a file bundled under `public/textures/`. It takes an equirectangular world map (longitude 180°W to 180°E left to right, north at the top), oriented like react-globe.gl, so coordinates and markers carry over unchanged from projects built on it. Bundled textures survive free-tier restarts; uploaded ones don't.

## Importing worlds

`src/lib/worlds/` holds worlds described as data (world, system, planet, regions, records, characters, narratives). `npm run db:import-worlds` creates whatever is missing and never changes existing records, so CMS edits are safe; Render runs it on every boot. **Vespera Prime** (from the slow-grow-trainer project) is the first. Its globe uses that project's original planet texture (`public/textures/vespera-prime.jpg`; the project credits its environmental imagery to Yaro, Discord iyaro87). Its theatre artwork is not included pending the artist's permission.

**Slow-grow campaign import.** `npm run db:import-slow-grow` reads a one-time export of the slow-grow-trainer campaign from `data/imports/slow-grow/` (git-ignored; never commit it) and adds it to Vespera Prime: each fought battle with a report becomes a draft **narrative** set in its theatre: the victor's TL;DR as the epigraph, each commander's account as a chapter, the deeds Campaign Command credited, and both warlords featured; the campaign's global events become published Events records; and the territory standings become each theatre's control snapshot (shown on the region page). An optional profiles export (`profiles.csv`, or Supabase's default `profiles_rows.csv`; only `id, commander_name, army_faction, army_subfaction, army_lore, crucible_datasheets` and the legacy `warlord_name` are read) names the commanders and adds their army chronicles, and each Crucible datasheet as a draft character (the first is the warlord, the rest champions) with an 11th edition statline and wargear. Each character records its commander (CMS only), and each battle features both commanders' warlords automatically; the CMS character picker can be searched by name or commander. Discord names in the export are ignored. Records are matched by `sourceRef`; a re-run updates only records nobody has edited since (`sourceHash`), and fills control only where none is set. To import into production, run it locally with `DATABASE_URL` set to the production (Supabase session pooler) URL. Lore records and narratives can also be linked to a region in the CMS, and are listed under "Chronicled here" on its page. Battle reports from an earlier version of the import (lore records) are removed on the next run unless they were edited.

## Star system themes

Each star system has a **Theme** section in the CMS: a preset (Imperial, Blood & Brass, Frost, Toxic, Warp-touched, Forge, Abyss, Ash), optional colour overrides, an atmosphere wash and an optional backdrop image. It applies to the system's page and all of its planets, with a live preview in the editor. Logic lives in `src/lib/theme.ts`.

## Tests

```bash
npm run db:test:migrate  # once, and after schema changes
npm test                 # unit + integration (Vitest, uses cerulean_test DB)
npm run test:e2e         # builds, then drives the real app in headless Chromium
```

## Layout

| Path | What |
|---|---|
| `prisma/schema.prisma` | Data model: User, World, Article, StarSystem, Planet, Media |
| `src/lib/content.ts` | All content mutations + ownership checks (admins edit everything, editors only their own worlds) |
| `src/lib/queries.ts` | Public read queries (published content only) |
| `src/lib/validation.ts` | Zod schemas for every form |
| `src/lib/storage.ts` | Image storage (local disk, checks file contents by magic bytes) |
| `src/app/admin/actions.ts` | Server actions behind the CMS forms |
| `src/app/w/[world]/…` | Public world, lore, system and planet pages |
| `src/middleware.ts` | Redirects unauthenticated `/admin` requests to login |

## Users and roles

Admins create accounts on **Users** in the CMS (there is no public sign-up).

- **Admin** can create, edit and delete anything, and manage users.
- **Contributor** can add records (lore, characters, units, narratives, systems, planets, images) to any published world, or to worlds they own. They can edit or delete only the records they authored. A world's settings belong to its owner.

Every record has an author. Deleting a user reassigns their worlds, records and uploads to the admin who deleted them; disabling a user keeps everything and blocks sign-in. Admins can't demote, disable or delete themselves or the last active admin. Everyone can change their own password under **Account**. The rules live in `src/lib/permissions.ts`.

## Roadmap

1. ~~Lore archive + admin CMS~~ (done)
2. **Interactive star map.** Render systems at their `x/y/z` with react-three-fiber; click through to a system view.
3. **Procedural planets.** A shader-based rotating planet driven by `Planet.genParams` (seed, palette, water level, clouds, etc.).
4. **Multi-creator.** Public registration, per-world collaborators, moderation.
5. **Deployment.** Move uploads from local disk to S3/R2 (swap `src/lib/storage.ts`), use a managed Postgres.
