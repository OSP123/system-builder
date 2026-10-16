import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}

test("planet regions: chart a theatre in the CMS, read it, find it on the globe", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Uses the "Map World" / "Orpheus Deep" / "Thalassa" system created by galaxy.spec.ts
  await login(page);
  await page.getByRole("link", { name: /Map World/ }).click();
  await page.getByRole("link", { name: "Star Systems", exact: true }).click();
  await page.getByRole("link", { name: /Orpheus Deep/ }).click();
  await page.getByRole("link", { name: /Thalassa/ }).click();
  await expect(page.getByRole("heading", { name: "Regions" })).toBeVisible();
  await page.getByRole("link", { name: "+ Add region" }).click();
  await expect(page.getByRole("heading", { name: "New region" })).toBeVisible();

  await page.getByLabel("Name").fill("The Sump Ruins");
  await page.getByLabel("Kind").fill("Theatre of war");
  await page.getByLabel("Latitude").fill("-25");
  await page.getByLabel("Longitude").fill("135");
  await page.getByLabel("Terrain").fill("Shattered crater.");
  await page.locator("textarea#summary").fill("Pockmarked blast craters thousands of feet deep.");
  await page.getByRole("button", { name: "+ Sector" }).click();
  await page.getByLabel("Sector name").fill("Buried Tomb");
  await page.getByLabel("Points level").fill("2000");
  await page.getByLabel("Buried Tomb shape").fill("260,190 520,210 500,360 220,340");
  await expect(page.getByRole("img", { name: /Tactical map/ })).toBeVisible(); // live preview
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create region" }).click();
  await expect(page.getByRole("status")).toContainText("Record inducted");

  // Out-of-range coordinates: the browser blocks them, and so does the server
  const lat = page.getByLabel("Latitude");
  await lat.fill("95");
  expect(await lat.evaluate((el: HTMLInputElement) => el.validity.rangeOverflow)).toBe(true);
  await lat.evaluate((el) => el.removeAttribute("max"));
  await page.getByRole("button", { name: "Save region" }).click();
  await expect(page.getByText("Latitude is between -90 and 90")).toBeVisible();
  await page.getByLabel("Latitude").fill("-25");
  await page.getByRole("button", { name: "Save region" }).click();
  await expect(page.getByRole("status")).toContainText("Record sanctified");

  // Public: listed on the planet, with its own page and tactical map
  await page.goto("/w/map-world/systems/orpheus-deep/thalassa");
  await page.getByRole("link", { name: /The Sump Ruins/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "The Sump Ruins" })).toBeVisible();
  await expect(page.getByText("25°S 135°E")).toBeVisible();
  const map = page.getByRole("img", { name: "Tactical map of The Sump Ruins" });
  await expect(map).toBeVisible();
  await expect(map.locator("polygon")).toHaveCount(1);
  await expect(map.getByText("BURIED TOMB")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Buried Tomb" })).toContainText("2000 pts");

  // Galaxy: the planet view lists the region and opens its record
  await page.goto("/galaxy?world=map-world");
  const panel = page.getByRole("complementary", { name: "Map details" });
  await panel.getByRole("button", { name: /Orpheus Deep/ }).click();
  await expect(page).toHaveURL(/system=/);
  await panel.getByRole("button", { name: /Thalassa/ }).click();
  await expect(page).toHaveURL(/planet=/);
  await panel.getByRole("button", { name: /The Sump Ruins/ }).click();
  await expect(panel.getByText("Pockmarked blast craters")).toBeVisible();
  await panel.getByRole("link", { name: "Open region record →" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "The Sump Ruins" })).toBeVisible();

  expect(errors).toEqual([]);
});
