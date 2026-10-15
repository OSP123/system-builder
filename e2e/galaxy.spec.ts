import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe.configure({ mode: "serial" });

test("galaxy map: chart a system, then fly from galaxy to system to planet", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Chart a published system on the southern fringe with one ocean world
  await login(page);
  await page.getByRole("link", { name: "+ New world" }).click();
  await expect(page.getByRole("heading", { name: "New world" })).toBeVisible();
  await page.getByLabel("Name").fill("Map World");
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create world" }).click();
  await expect(page.getByRole("heading", { name: "Map World" })).toBeVisible();
  await page.getByRole("link", { name: "Star Systems", exact: true }).click();
  await page.getByRole("link", { name: "+ New system" }).click();
  await expect(page.getByRole("heading", { name: "New star system" })).toBeVisible();
  await page.getByLabel("Name").fill("Orpheus Deep");
  await page.getByLabel("Star type").fill("Blue giant");
  await page.getByLabel("X (east +)").fill("-6000");
  await page.getByLabel("Z (south +)").fill("44000");
  await expect(page.getByText("Segmentum Tempestus ·")).toBeVisible(); // live readout in the CMS
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create system" }).click();
  await expect(page.getByRole("status")).toContainText("Record inducted");
  await page.getByRole("link", { name: "+ Add" }).click();
  await expect(page.getByRole("heading", { name: "New planet" })).toBeVisible();
  await page.getByLabel("Name").fill("Thalassa");
  await page.getByLabel("Classification").fill("Ocean World");
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create planet" }).click();
  await expect(page.getByRole("status")).toContainText("Record inducted");

  // Galaxy level
  await page.goto("/galaxy?world=map-world");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  const panel = page.getByRole("complementary", { name: "Map details" });
  await expect(panel.getByRole("heading", { name: "The Galaxy" })).toBeVisible();
  const entry = panel.getByRole("button", { name: /Orpheus Deep/ });
  await expect(entry).toContainText("Tempestus");

  // Overlays toggle without errors
  await page.getByLabel("Great Rift").check();
  await page.getByLabel("Labels").uncheck();
  await page.getByLabel("Labels").check();

  // Galaxy -> system (camera flies in, then the URL updates)
  await entry.click();
  await expect(page).toHaveURL(/[?&]system=/, { timeout: 15_000 });
  await expect(panel.getByRole("heading", { name: "Orpheus Deep System" })).toBeVisible();
  await expect(panel.getByText("Segmentum Tempestus")).toBeVisible();
  await expect(panel.getByText("Blue giant")).toBeVisible();

  // System -> planet
  await panel.getByRole("button", { name: /Thalassa/ }).click();
  await expect(page).toHaveURL(/[?&]planet=/);
  await expect(panel.getByRole("heading", { name: "Thalassa" })).toBeVisible();
  await expect(panel.getByText("Ocean World")).toBeVisible();

  // Escape goes up a level; Back returns to the planet
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/planet=/);
  await expect(panel.getByRole("heading", { name: "Orpheus Deep System" })).toBeVisible();
  await page.goBack();
  await expect(panel.getByRole("heading", { name: "Thalassa" })).toBeVisible();

  // A shared link opens straight at that level, and records link through
  const shared = page.url();
  await page.goto(shared);
  await expect(panel.getByRole("heading", { name: "Thalassa" })).toBeVisible();
  await panel.getByRole("link", { name: "Open record" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Thalassa" })).toBeVisible();

  // Unknown ids fall back to the galaxy
  await page.goto("/galaxy?system=does-not-exist");
  await expect(panel.getByRole("heading", { name: "The Galaxy" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("galaxy map: without WebGL, the systems index still works", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/galaxy?world=map-world");
  await expect(page.getByText("This device can't display 3D graphics")).toBeVisible();
  const panel = page.getByRole("complementary", { name: "Map details" });
  await panel.getByRole("button", { name: /Orpheus Deep/ }).click();
  await expect(page).toHaveURL(/[?&]system=/);
  await expect(panel.getByRole("heading", { name: "Orpheus Deep System" })).toBeVisible();
});
