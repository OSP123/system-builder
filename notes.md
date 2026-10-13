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

