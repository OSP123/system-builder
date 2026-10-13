import { expect, test } from "@playwright/test";
import path from "node:path";
import { E2E_ADMIN } from "./global-setup";

const fixture = (name: string) => path.join(__dirname, "fixtures", name);

test("anonymous users are kept out of the CMS", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin/);

  const res = await request.post("/api/admin/media", { multipart: { worldId: "x" } });
  expect(res.status()).toBe(401);
});

test("bad credentials show an error", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
});

test("admin builds a world end to end and it appears publicly", async ({ page }) => {
  // Sign in
  await page.goto("/admin");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Your worlds" })).toBeVisible();

  // Create world
  await page.getByRole("link", { name: "+ New world" }).click();
  await expect(page.getByRole("heading", { name: "New world" })).toBeVisible();
  await page.getByLabel("Name").fill("Cerulean Test");
  await page.getByLabel("Tagline").fill("A sector at the edge of the light");
  await page.getByRole("button", { name: "Create world" }).click();
  await expect(page.getByRole("heading", { name: "Cerulean Test" })).toBeVisible();

  // Upload a cover image through the picker; a non-image must be rejected
  const uploader = page.locator('input[type="file"]').first();
  await uploader.setInputFiles(fixture("not-an-image.png"));
  await expect(page.getByText("Only JPEG, PNG, WebP, GIF and AVIF images are allowed")).toBeVisible();
  await uploader.setInputFiles(fixture("cerulean.png"));
  await expect(page.locator('input[name="coverImageId"]')).not.toHaveValue("");

  await page.locator("textarea#summary").fill("# The Reach\n\nWhere the Astronomican **falters**.");
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Save world" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");

  // Create a lore record, check the markdown preview, then publish
  await page.getByRole("link", { name: "Lore", exact: true }).click();
  await page.getByRole("link", { name: "+ New record" }).click();
  await expect(page.getByRole("heading", { name: "New record" })).toBeVisible();
  await page.getByLabel("Title").fill("The Azure Crusade");
  await page.getByLabel("Category").selectOption("BATTLE");
  await page.getByLabel("Summary").fill("A war of faith in M41.");
  await page.locator("textarea#body").fill("## Prelude\n\n> Faith is my shield.");
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByRole("heading", { name: "Prelude" })).toBeVisible();
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create record" }).click();
  await expect(page).toHaveURL(/\/articles\/[^/]+\?created=1/);

  // Duplicate slug should be a field error, not a crash
  await page.getByRole("link", { name: "← Lore" }).click();
  await page.getByRole("link", { name: "+ New record" }).click();
  await expect(page.getByRole("heading", { name: "New record" })).toBeVisible();
  await page.getByLabel("Title").fill("The Azure Crusade");
  await page.getByLabel("Summary").fill("Typed text must survive a failed save");
  await page.getByRole("button", { name: "Create record" }).click();
  await expect(page.getByText("That slug is already in use")).toBeVisible();
  await expect(page.getByLabel("Summary")).toHaveValue("Typed text must survive a failed save");

  // Chart a system and a planet
  await page.getByRole("link", { name: "Star Systems" }).click();
  await page.getByRole("link", { name: "+ New system" }).click();
  await expect(page.getByRole("heading", { name: "New star system" })).toBeVisible();
  await page.getByLabel("Name").fill("Azure Veil");
  await page.getByLabel("Star type").fill("Blue giant");
  await page.getByLabel("X", { exact: true }).fill("120.5");
  // Theme: pick a preset and watch the live preview pick up its colours
  await page.getByLabel("Preset").selectOption("forge");
  await expect(page.getByLabel("Theme preview")).toHaveAttribute("style", /--color-blood-bright:\s*#c2410c/);
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create system" }).click();
  await expect(page.getByRole("heading", { name: "Azure Veil" })).toBeVisible();

  await page.getByRole("link", { name: "+ Add" }).click();
  await expect(page.getByRole("heading", { name: "New planet" })).toBeVisible();
  await page.getByLabel("Name").fill("Cerulea Prime");
  await page.getByLabel("Classification").fill("Hive World");
  await page.getByLabel("Population").fill("~40 billion");
  await page.getByLabel("Generator parameters (JSON, optional)").fill("{not json");
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create planet" }).click();
  await expect(page.getByText("Must be a JSON object")).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveValue("Cerulea Prime");
  await page.getByLabel("Generator parameters (JSON, optional)").fill('{"seed": 42}');
  await page.getByRole("button", { name: "Create planet" }).click();
  await expect(page).toHaveURL(/\/planets\/[^/]+\?created=1/);

  // Public site
  await page.goto("/");
  await page.getByRole("link", { name: /Cerulean Test/ }).click();
  await expect(page.getByRole("heading", { name: "The Reach" })).toBeVisible();
  const cover = page.locator("section img").first();
  await expect(cover).toHaveJSProperty("complete", true);
  expect(await cover.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(64);

  await page.getByRole("link", { name: /The Azure Crusade/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "The Azure Crusade" })).toBeVisible();
  await expect(page.getByText("Faith is my shield.")).toBeVisible();

  await page.goto("/w/cerulean-test/systems/azure-veil");
  const scope = page.locator('[data-theme-preset="forge"]');
  await expect(scope).toHaveCount(1);
  expect(await scope.evaluate((el) => getComputedStyle(el).getPropertyValue("--color-blood-bright").trim())).toBe("#c2410c");

  await page.getByRole("link", { name: "Star Systems", exact: true }).click();
  await page.getByRole("link", { name: "Cerulea Prime" }).click();
  await expect(page.locator('[data-theme-preset="forge"]')).toHaveCount(1);
  await expect(page.getByText("IMPERIAL RECORD")).toBeVisible();
  await expect(page.getByText("~40 billion")).toBeVisible();

  // Sign out
  await page.goto("/admin");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("unpublished worlds are not publicly reachable", async ({ request }) => {
  const res = await request.get("/w/does-not-exist");
  expect(res.status()).toBe(404);
});
