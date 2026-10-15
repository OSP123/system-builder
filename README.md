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

`render.yaml` is a Render Blueprint for the **free tier**: a Node web service plus a free Postgres database.

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, pick the repo, and enter `ADMIN_EMAIL` and `ADMIN_PASSWORD` when prompted. `AUTH_SECRET` is generated for you.
3. On every boot the service runs migrations, the admin seed (which creates the admin account if it's missing but never changes an existing password unless `ADMIN_RESET_PASSWORD=true`) and the lore import, then starts. Render health-checks `/api/health`.
4. For password-reset emails, set `RESEND_API_KEY` and `EMAIL_FROM` in the Render dashboard.

Before anything else, the start command runs a configuration check (`npm run check-env`). It stops the boot with a readable list if a required setting is missing or malformed (`DATABASE_URL`, `AUTH_SECRET` of 32+ characters, `ADMIN_EMAIL`), and logs warnings for optional ones (Resend, `APP_URL`). Render keeps the previous version running when a boot fails.

If you created the service with **New → Web Service** instead of a Blueprint, `render.yaml` isn't applied, so nothing is generated for you. Set `AUTH_SECRET` yourself (`openssl rand -base64 32`), and use `npm run start:render` as the start command.

Free-tier limits:
- **Uploaded images are temporary.** There's no persistent disk, so uploads vanish on each deploy or restart. The CMS shows a warning banner. Text content lives in Postgres and is safe.
- **Free Postgres expires after 30 days.**
- **The site sleeps after 15 idle minutes**, so the first visit afterwards takes about a minute.

To upgrade, follow the comment at the top of `render.yaml`: a Starter instance plus disk (about $7/month) and `basic-256mb` Postgres (about $6/month). Alternatively, move uploads to S3/R2 via `src/lib/storage.ts`.

To use your emblem in production, commit it to `public/`.

## Characters, Army List and Narratives

Three codex-style sections, presented like the 3rd edition rulebook: printed pages, black banners, Caslon text and black-header statlines.

- **Characters** (`/w/<world>/characters`): Dramatis Personae, ordered by an importance number. Each has a title, faction, status, portrait, quote, optional statline, wargear, special rules, biography and homeworld.
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
