import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Your worlds" })).toBeVisible();
}

test("characters, army list and narratives: build in the CMS, read in rulebook style", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "+ New world" }).click();
  await expect(page.getByRole("heading", { name: "New world" })).toBeVisible();
  await page.getByLabel("Name").fill("Codex World");
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create world" }).click();
  await expect(page.getByRole("heading", { name: "Codex World" })).toBeVisible();

  // Character with a statline and a special rule
  await page.getByRole("link", { name: "Characters", exact: true }).click();
  await page.getByRole("link", { name: "+ New character" }).click();
  await expect(page.getByRole("heading", { name: "New character" })).toBeVisible();
  await page.getByLabel("Name").fill("Hesaar");
  await page.getByLabel("Rank or title").fill("Custodian Captain");
  await page.getByLabel("Faction / allegiance").fill("Adeptus Custodes");
  await page.getByLabel("Quote", { exact: true }).fill("The Emperor's will is my blade.");
  await page.getByRole("button", { name: "+ Add statline" }).click();
  await page.getByLabel("Profile name").fill("Hesaar");
  await page.getByLabel("Hesaar WS").fill("6");
  await page.getByLabel("Hesaar Sv").fill("2+");
  await page.getByRole("button", { name: "+ Special rule" }).click();
  await page.getByLabel("Rule name").fill("Eternal Warrior");
  await page.getByLabel("Rule description").fill("Never suffers instant death.");
  await page.getByLabel("Wargear").fill("Guardian spear\nArtificer armour");
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create character" }).click();
  await expect(page).toHaveURL(/\/characters\/[^/]+\?created=1/);

  // Invalid characteristic is a field error, and typed values survive it
  await page.getByLabel("Hesaar WS").fill("<b>");
  await page.getByRole("button", { name: "Save character" }).click();
  await expect(page.getByText("Use numbers, D, +, -, / or *")).toBeVisible();
  await page.getByLabel("Hesaar WS").fill("6");
  await page.getByRole("button", { name: "Save character" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");

  // Unit with model + vehicle profiles
  await page.getByRole("link", { name: "Army List", exact: true }).click();
  await page.getByRole("link", { name: "+ New unit" }).click();
  await expect(page.getByRole("heading", { name: "New unit" })).toBeVisible();
  await page.getByLabel("Unit name").fill("Azure Tactical Squad");
  await page.getByLabel("Force Organisation slot").selectOption("TROOPS");
  await page.getByLabel("Points", { exact: true }).fill("15 pts/model");
  await page.getByLabel("Squad composition").fill("The squad consists of 5 to 10 Battle-Brothers.");
  await page.getByRole("button", { name: "+ Model profile" }).click();
  await page.getByLabel("Profile name").fill("Battle-Brother");
  await page.getByLabel("Battle-Brother WS").fill("4");
  await page.getByLabel("Battle-Brother Ld").fill("8");
  await page.getByRole("button", { name: "+ Vehicle profile" }).click();
  await page.getByLabel("Profile name").nth(1).fill("Rhino");
  await page.getByLabel("Rhino Front").fill("11");
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create unit" }).click();
  await expect(page).toHaveURL(/\/units\/[^/]+\?created=1/);

  // Narrative featuring the character
  await page.getByRole("link", { name: "Narratives", exact: true }).click();
  await page.getByRole("link", { name: "+ New narrative" }).click();
  await expect(page.getByRole("heading", { name: "New narrative" })).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill("Into the Deep");
  await page.getByLabel("Epigraph", { exact: true }).fill("Every depth hides a deeper dark.");
  await page.locator("textarea#body").fill("## The Descent\n\nThe drones went silent.\n\n## The Leviathan\n\nIt rose.");
  await page.getByLabel(/Hesaar/).check();
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create narrative" }).click();
  await expect(page).toHaveURL(/\/narratives\/[^/]+\?created=1/);

  // Public: Dramatis Personae + character page
  await page.goto("/w/codex-world/characters");
  await expect(page.getByRole("heading", { name: "Dramatis Personae" })).toBeVisible();
  await page.getByRole("link", { name: /Hesaar/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hesaar" })).toBeVisible();
  await expect(page.locator("table.statline th").nth(1)).toHaveText("WS");
  await expect(page.locator("table.statline td").nth(1)).toHaveText("6");
  await expect(page.getByText("Eternal Warrior.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Into the Deep" })).toBeVisible();

  // Public: army list grouped by slot, with model and vehicle tables
  await page.goto("/w/codex-world/units");
  await expect(page.getByRole("heading", { name: "Troops" })).toBeVisible();
  await expect(page.getByText("15 pts/model")).toBeVisible();
  await expect(page.locator("table.statline")).toHaveCount(2);
  await expect(page.getByText("Front")).toBeVisible();

  // Public: narrative with contents linking to chapter anchors
  await page.goto("/w/codex-world/narratives");
  await page.getByRole("link", { name: /Into the Deep/ }).click();
  await expect(page.getByText("Every depth hides a deeper dark.")).toBeVisible();
  await page.getByRole("link", { name: "The Leviathan" }).click();
  await expect(page).toHaveURL(/#the-leviathan$/);
  await expect(page.locator("h2#the-leviathan")).toBeVisible();
  await expect(page.getByRole("complementary").getByRole("link", { name: "Hesaar" })).toBeVisible();
});
