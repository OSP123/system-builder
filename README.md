# Cerulean

A lore archive and CMS for custom worlds in the Warhammer 40,000 universe. It starts with the world of Cerulean, and other creators can add their own worlds.

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

Re-running `npm run db:seed` resets the admin password to whatever `ADMIN_PASSWORD` is set to.

## Your emblem

Put your symbol at `public/emblem.svg` (or `.png`, `.webp`, `.jpg`, `.avif`). It shows in the header, the home and world heroes, the login page and the CMS. With no file present, nothing is drawn. `npm run dev` picks it up immediately; a production server (`npm start`) must be restarted after adding it. SVG or a PNG with a transparent background looks best.

## Deploying to Render

`render.yaml` is a Render Blueprint for the **free tier**: a Node web service plus a free Postgres database.

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, pick the repo, and enter `ADMIN_EMAIL` and `ADMIN_PASSWORD` when prompted. `AUTH_SECRET` is generated for you.
3. On every boot the service runs migrations, the admin seed (which resets the admin password to `ADMIN_PASSWORD`) and the lore import, then starts. Render health-checks `/api/health`.

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

- `ADMIN` can edit every world.
- `EDITOR` can edit only the worlds they own.

For now the only account is the seeded admin. Opening sign-ups to other creators means adding a registration flow, since the ownership model already exists.

## Roadmap

1. ~~Lore archive + admin CMS~~ (done)
2. **Interactive star map.** Render systems at their `x/y/z` with react-three-fiber; click through to a system view.
3. **Procedural planets.** A shader-based rotating planet driven by `Planet.genParams` (seed, palette, water level, clouds, etc.).
4. **Multi-creator.** Public registration, per-world collaborators, moderation.
5. **Deployment.** Move uploads from local disk to S3/R2 (swap `src/lib/storage.ts`), use a managed Postgres.
