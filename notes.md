Date: 2026-10-13
Tasks:
- Scaffolded Next.js 15 + TypeScript + Tailwind 4 app with Prisma/PostgreSQL (Docker on port 5433)
- Data model: User (ADMIN/EDITOR), World, Article (14 40k lore categories), StarSystem (x/y/z for future star map), Planet (genParams JSON for future 3D generator), Media
- Admin CMS at /admin: JWT cookie auth, worlds/lore/systems/planets CRUD, Markdown editor with preview + image insertion, image library with upload (magic-byte validated, 10 MB cap)
- Public site: world index, world page with categorized archive, lore, systems, system and planet pages
- Fixed React 19 form reset wiping user input on validation errors (ActionForm submits via transition)
- Tests: 34 Vitest unit/integration tests and 4 Playwright end-to-end tests, all passing; visually checked via screenshots
Follow-ups:
- User should change ADMIN_PASSWORD in .env and re-run `npm run db:seed`
- Phase 2: interactive star map; Phase 3: procedural planet renderer
- Storage is local disk; needs S3/R2 before deploying to serverless hosting
- No sign-up flow yet for other creators (ownership model is in place)
- Not yet verified by the user in their own browser

Date: 2026-10-13
Tasks:
- Imported Sons-of-Cerulean-lore.md into the Cerulean world: 10 articles split along the author's own section headings (text kept verbatim), plus the Cerulean star system and planet (Death World, Orpheus Sector)
- "Story" section imported as an unpublished draft ("Story Perspectives") since it is author notes, not in-world lore
- Added `npm run db:import-lore` (idempotent; won't overwrite CMS edits unless --force) and parser tests
- Verified pages on the dev database via HTTP checks and screenshots
Follow-ups:
- History articles list alphabetically, not chronologically; consider a sort-order field
- Possible source inconsistencies for the author to resolve: Hessar/Hesaar, Torketh/Tarketh, "22nd century" vs "22nd millennium", "Nectrontyr"/"Necrontyr"; Current Day ends mid-sentence ("Drones analyze the shield")
- Candidate new records: characters (Hessar, Strone, Torketh, Versus, Syl), Sons of Cerulean chapter, the Citadel, Rust as its own location

Date: 2026-10-13
Tasks:
- Corrected spellings in Sons-of-Cerulean-lore.md (Hesaar, Tarketh, Necrontyr, 22nd millennium) and re-imported with --force (no CMS edits existed)
- Added 8 draft stub records (Hesaar, Strone, Tarketh, Versus, Syl, Sons of Cerulean, The Citadel, Rust); importer creates them once and never overwrites them
- Grimdark theme overhaul: blackletter/Cinzel/IM Fell/Share Tech Mono type, soot/bone/gold/blood palette, film grain + vignette, original SVG aquila, skull dividers, purity seals, gilded frames, cross-pattée bullets, drop caps on lore records, cogitator terminal panels, thought-for-the-day footer, unofficial-fan-work notice; CMS restyled to match
- Verified: 46 Vitest + 4 Playwright tests passing; screenshots at desktop and mobile widths, no console errors or horizontal overflow
Follow-ups:
- History records still list alphabetically; consider a sort-order field
- Stubs are drafts; publish each once written
- Not yet reviewed by the user in their own browser

Date: 2026-10-13
Tasks:
- Removed the aquila and purity seals; added an emblem slot (public/emblem.*) used in header, heroes, login and CMS, with tests
- Pushed the theme toward John Blanche: umber/oxblood/bone palette, mottled ink-wash grime, scratches, burnt vignette, hand-ruled ragged borders and ink-frayed lettering via SVG displacement filters, procedural ink splatters, Grenze Gotisch + IM Fell (incl. small caps), grimier cogitator panels
- Verified: 49 Vitest + 4 Playwright tests passing; screenshots desktop and mobile, no console errors, no horizontal overflow; emblem slot verified with a temporary file (removed)
Follow-ups:
- User to add their emblem file
- History records still sort alphabetically (sort-order field)

Date: 2026-10-13
Tasks:
- Per-star-system themes: StarSystem.theme (JSON) + backdrop image; 8 presets, per-colour overrides, atmosphere strength, backdrop opacity; live preview in the CMS; applied to system and planet pages and system list cards; frames/rules now follow theme colours
- Render deployment prep: render.yaml Blueprint (web + Postgres + persistent disk), /api/health, Node engine, README deploy section
- Verified: 60 Vitest + 4 Playwright tests passing (e2e covers picking a preset and seeing it on public pages); screenshots of editor/preview and a themed planet page
Follow-ups:
- Push to GitHub and create the Render Blueprint (needs user's account decisions and Render login)
- Render costs: Starter web (~$7/mo) + basic-256mb Postgres (~$6/mo)

Date: 2026-10-14
Tasks:
- Added Characters (Dramatis Personae), Army List (units by Force Org slot) and Narratives sections: Prisma models, validation, permission-checked mutations, CMS tabs/forms (statline, special-rule and featured-character editors), public pages
- 3rd edition rulebook design system: printed-page panels, notched black banners, Caslon type, black-header statlines (model + vehicle armour), dotted points leaders, boxed sidebars, B&W art, narrative contents with chapter anchors
- Moved the Hesaar/Strone/Tarketh/Versus/Syl drafts from lore articles into Characters (importer migrates on boot; keeps any non-empty article)
- Verified: 72 Vitest + 5 Playwright tests passing; screenshots desktop/mobile, no console errors or overflow
Follow-ups:
- Merge feature/codex-sections to main to deploy (Render runs migrations on boot)
- Character drafts are unpublished; fill in and publish

Date: 2026-10-14
Tasks:
- Renamed the app brand from "Cerulean" (one world) to "Archivum" via src/lib/site.ts (header, tab titles, footer, login, CMS); world hero line made generic ("Sealed by order of the Administratum")
- Verified: 72 Vitest + 5 Playwright tests passing; screenshots of header and login
Follow-ups:
- Incident: a screenshot cleanup step killed the process on port 3101, which was the user's Land of Nerds dev server; it needs restarting. Screenshot servers now use a free port and stop only their own PID.

Date: 2026-10-14
Tasks:
- CMS save feedback in 40k terms for every form: "Record sanctified" / "Record inducted" (cogitator panel, auto-fades) and "Heresy detected" / "Access denied" / "Machine spirit unresponsive" (blood-red, stays until dismissed, scrolls to first error)
- Unexpected server errors during save now return a failure notice instead of crashing the page (unstable_rethrow keeps redirects working)
- e2e builds use their own dist dir (.next-e2e) so they don't collide with a running `npm run dev`
- Verified: 76 Vitest + 5 Playwright tests passing; screenshots of both notices
Follow-ups:
- None

Date: 2026-10-14
Tasks:
- Contributors: every record now has an author (migration backfills to the world owner); non-admins can add to published worlds or their own, and edit/delete only what they authored; world settings stay with the owner; admins can do everything
- Users page (admin): create users with temporary passwords, change role, disable, reset password, delete (content reassigned to the admin); lock-out protection for self and the last admin. Account page: change own password
- CMS shows an Author column ("You" for your own), sealed read-only view for others' records, contributor dashboard ("Open to contributors"); media captions/deletes limited to uploader or admin
- Security: upload API and all checks use the user loaded from the DB (not the cookie role); disabled users lose access on their next request
- Verified: 88 Vitest + 6 Playwright tests passing (new end-to-end contributor flow); screenshots of users page, contributor dashboard and sealed record
Follow-ups:
- Give contributors display names, otherwise their email is shown as author
- Merge feature/contributors (stacked on feature/codex-sections) to main to deploy

Date: 2026-10-14
Tasks:
- Fixed: the boot-time seed reset the admin password to ADMIN_PASSWORD on every Render start; it now only sets it on creation or when ADMIN_RESET_PASSWORD=true
- Forgot-password flow: emailed one-time links (1h expiry, hashed at rest, newest link voids older ones, 3/hour/account limit, identical response and padded timing for unknown emails), reset page with no-referrer
- Any password change (reset link, admin reset, Account page, forced seed reset) signs the user out on other devices (passwordChangedAt vs session iat); the changer's own session is re-issued
- Email via Resend HTTP API (key in git-ignored .env and Render dashboard), outbox-file transport for tests, console fallback; links built from APP_URL/RENDER_EXTERNAL_URL, never the Host header
- Verified: 106 Vitest + 7 Playwright tests passing (new e2e covers the whole reset flow incl. signing out another session); real Resend send accepted for the account's own address
Follow-ups:
- Resend sandbox only delivers to omarpatel123@yahoo.com; verify a domain in Resend (and set EMAIL_FROM) before reset emails reach the gmail admin or contributors
- Consider rotating the Resend API key (it was pasted into chat)
- Set RESEND_API_KEY/EMAIL_FROM in Render

Date: 2026-10-14
Tasks:
- Created three Contributor accounts in the local database (everythingstop@hotmail.com, kenneth.s.hudson@gmail.com, deanpaulmay@gmail.com) via the users service; verified each can sign in and sees "Open to contributors"
Follow-ups:
- Accounts exist locally only; create them on the live site via Users after deploying
- No display names set (their emails will show as author); ask them to change their passwords under Account

Date: 2026-10-14
Tasks:
- Full pre-push verification: typecheck, lint, 106 Vitest, fresh production build, 7 Playwright; rehearsed the upgrade from the deployed commit on a scratch database (migrations, seed, character move) with no data loss
- Fast-forwarded main to the feature work and pushed; Render deployed it
- Verified live site (https://system-builder-0zxo.onrender.com): health OK, new pages (characters, army list, narratives, forgot password) live, protected routes redirect/401 when signed out, no console errors
Follow-ups:
- Create the three contributor accounts on the live Users page
- Set RESEND_API_KEY / EMAIL_FROM on Render; verify a domain in Resend
- Free tier: uploaded images are lost on restart/deploy; free Postgres expires 30 days after creation

Date: 2026-10-14
Tasks:
- Live login crashed: AUTH_SECRET missing on Render (service was created manually, so render.yaml's generated secret never applied); user to set it in the dashboard
- Added a boot-time configuration check (src/lib/env-check.ts, `npm run check-env`) run first by `start` and `start:render`: fails with readable fixes for missing/short AUTH_SECRET, bad DATABASE_URL (incl. localhost in production), ADMIN_EMAIL, APP_URL, old Node; warns for ADMIN_PASSWORD, Resend and EMAIL_FROM; never prints secret values
- Verified: 115 Vitest (9 new) + 7 Playwright; simulated Render's current config fails before migrations, passes once AUTH_SECRET is added
- Note: a mistyped local simulation briefly ran start:render against the local dev DB; it made no changes (no pending migrations, admin unchanged, nothing created) and left no process running
Follow-ups:
- Set AUTH_SECRET on Render before deploying this (otherwise the deploy is rejected by the check, and the old version stays up)

