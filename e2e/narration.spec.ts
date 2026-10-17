import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

test.use({ permissions: ["microphone"] });

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "All worlds" })).toBeVisible();
}

test("record a narration in the CMS and listen to it on the record's page", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "+ New world" }).click();
  await page.getByLabel("Name").fill("Narrated World");
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create world" }).click();
  await expect(page.getByRole("heading", { name: "Narrated World" })).toBeVisible();

  await page.getByRole("link", { name: "Lore", exact: true }).click();
  await page.getByRole("link", { name: "+ New record" }).click();
  await page.getByLabel("Title").fill("The Voice of the Reach");
  await page.getByLabel("Category").selectOption("BATTLE");
  await page.locator("textarea#body").fill("The guns spoke, and the line held.");

  // Something that isn't audio is refused.
  await page.locator('input[type="file"][accept="audio/*"]').setInputFiles({ name: "notes.mp3", mimeType: "audio/mpeg", buffer: Buffer.from("MZ not really audio") });
  await expect(page.getByText("Only WebM, MP4/M4A, Ogg, MP3 and WAV audio is allowed")).toBeVisible();

  // Record about two seconds from the (fake) microphone, listen back, keep it.
  await page.getByRole("button", { name: "● Record" }).click();
  await expect(page.getByText("Recording", { exact: true })).toBeVisible();
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "■ Stop" }).click();
  await expect(page.getByText(/Take of 0:0\d/)).toBeVisible();
  await page.getByRole("button", { name: "Keep this take" }).click();
  await expect(page.getByText("New narration. Save to keep it.")).toBeVisible();
  await expect(page.locator('input[name="narrationId"]')).not.toHaveValue("");

  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create record" }).click();
  await expect(page.getByRole("status")).toContainText("Record inducted");
  await expect(page.getByText("Current narration.")).toBeVisible();

  // The public page plays it, with a real length (WebM durations are written in before upload).
  await page.goto("/w/narrated-world/lore/the-voice-of-the-reach");
  await expect(page.getByText("Hear this record read aloud")).toBeVisible();
  const duration = await page.locator("audio").evaluate(
    (a: HTMLAudioElement) =>
      new Promise<number>((resolve, reject) => {
        a.preload = "metadata";
        a.onloadedmetadata = () => resolve(a.duration);
        a.onerror = () => reject(new Error("audio failed to load"));
        a.load();
      }),
  );
  expect(duration).toBeGreaterThan(1);
  expect(Number.isFinite(duration)).toBe(true);

  // Removing the narration takes the player away.
  await page.goto("/admin");
  await page.getByRole("link", { name: "Narrated World" }).first().click();
  await page.getByRole("link", { name: "Lore", exact: true }).click();
  await page.getByRole("link", { name: "The Voice of the Reach" }).click();
  await page.getByRole("button", { name: "Remove narration" }).click();
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("status")).toContainText("Record sanctified");
  await page.goto("/w/narrated-world/lore/the-voice-of-the-reach");
  await expect(page.getByText("The guns spoke")).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(0);
});
