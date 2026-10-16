import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

/**
 * Phone-width guard: every page type, public and CMS, must fit a 375px screen
 * without sideways scrolling and keep tap targets at least 24px (WCAG 2.2 AA).
 * Uses the content created by the earlier specs in this run.
 */

config({ path: ".env.test", override: true });
test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

async function pagePaths() {
  const db = new PrismaClient();
  const one = async <T>(p: Promise<T | null>) => {
    const r = await p;
    if (!r) throw new Error("Expected content from earlier specs is missing");
    return r;
  };
  const world = await one(db.world.findUnique({ where: { slug: "cerulean-test" } }));
  const codex = await one(db.world.findUnique({ where: { slug: "codex-world" } }));
  const article = await one(db.article.findFirst({ where: { worldId: world.id } }));
  const character = await one(db.character.findFirst({ where: { worldId: codex.id } }));
  const unit = await one(db.unit.findFirst({ where: { worldId: codex.id } }));
  const narrative = await one(db.narrative.findFirst({ where: { worldId: codex.id } }));
  const system = await one(db.starSystem.findFirst({ where: { worldId: world.id }, include: { planets: true } }));
  const user = await one(db.user.findFirst({ where: { role: "EDITOR" } }));
  const region = await one(db.region.findFirst({ include: { planet: { include: { system: { include: { world: true } } } } } }));
  const rp = region.planet;
  const regionPublic = `/w/${rp.system.world.slug}/systems/${rp.system.slug}/${rp.slug}/${region.slug}`;
  const regionAdmin = `/admin/worlds/${rp.system.worldId}/systems/${rp.systemId}/planets/${rp.id}/regions/${region.id}`;
  await db.$disconnect();
  const w = `/admin/worlds/${world.id}`;
  const c = `/admin/worlds/${codex.id}`;
  return {
    public: [
      "/",
      `/w/${world.slug}`,
      `/w/${world.slug}/lore/${article.slug}`,
      `/w/${codex.slug}/characters`,
      `/w/${codex.slug}/characters/${character.slug}`,
      `/w/${codex.slug}/units`,
      `/w/${codex.slug}/units/${unit.slug}`,
      `/w/${codex.slug}/narratives`,
      `/w/${codex.slug}/narratives/${narrative.slug}`,
      `/w/${world.slug}/systems`,
      `/w/${world.slug}/systems/${system.slug}`,
      `/w/${world.slug}/systems/${system.slug}/${system.planets[0].slug}`,
      regionPublic,
      "/galaxy",
      "/admin/login",
      "/admin/forgot-password",
    ],
    admin: [
      "/admin",
      w,
      `${w}/articles`,
      `${w}/articles/${article.id}`,
      `${c}/characters`,
      `${c}/characters/${character.id}`,
      `${c}/units/${unit.id}`,
      `${c}/narratives/${narrative.id}`,
      `${w}/systems`,
      `${w}/systems/${system.id}`,
      `${w}/systems/${system.id}/planets/${system.planets[0].id}`,
      `${w}/media`,
      regionAdmin,
      "/admin/users",
      `/admin/users/${user.id}`,
      "/admin/account",
    ],
  };
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const small = [...document.querySelectorAll<HTMLElement>("a, button, input:not([type=hidden]), select, textarea")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0) || getComputedStyle(e).visibility === "hidden") return false;
        const label = e.closest("label");
        if (label && label.getBoundingClientRect().height >= 24) return false; // the label is the target
        return r.height < 24 || r.width < 24;
      })
      .map((e) => `${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 30)}"`);
    return { overflow, small };
  });
}

test("every page fits a phone screen with comfortable tap targets", async ({ page }) => {
  const paths = await pagePaths();
  const problems: string[] = [];
  const check = async (path: string) => {
    await page.goto(path, { waitUntil: "networkidle" });
    if (path === "/galaxy") await page.locator("canvas").waitFor();
    const { overflow, small } = await measure(page);
    if (overflow > 0) problems.push(`${path}: scrolls sideways by ${overflow}px`);
    if (small.length) problems.push(`${path}: small tap targets ${small.join(", ")}`);
  };

  for (const path of paths.public) await check(path);

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
  for (const path of paths.admin) await check(path);

  expect(problems).toEqual([]);
});
