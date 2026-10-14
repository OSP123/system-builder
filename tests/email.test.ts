import { readdir, readFile, rm } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appBaseUrl, sendEmail } from "@/lib/email";

const msg = { to: "a@test.dev", subject: "Hi", text: "plain", html: "<p>html</p>" };

describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("writes to the outbox when EMAIL_OUTBOX_DIR is set", async () => {
    const dir = "./.test-outbox-unit";
    vi.stubEnv("EMAIL_OUTBOX_DIR", dir);
    await sendEmail(msg);
    const files = await readdir(dir);
    expect(JSON.parse(await readFile(`${dir}/${files[0]}`, "utf8"))).toEqual(msg);
    await rm(dir, { recursive: true, force: true });
  });

  it("calls Resend with the API key when configured", async () => {
    vi.stubEnv("EMAIL_OUTBOX_DIR", "");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Archivum <x@y.dev>");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendEmail(msg);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body)).toMatchObject({ from: "Archivum <x@y.dev>", to: ["a@test.dev"], subject: "Hi" });
  });

  it("throws a generic error when Resend rejects the message", async () => {
    vi.stubEnv("EMAIL_OUTBOX_DIR", "");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad key", { status: 401 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendEmail(msg)).rejects.toThrow("Email could not be sent");
  });
});

describe("appBaseUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("prefers APP_URL, then Render's external URL, and trims slashes", () => {
    vi.stubEnv("APP_URL", "https://archivum.example/");
    expect(appBaseUrl()).toBe("https://archivum.example");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://cerulean.onrender.com");
    expect(appBaseUrl()).toBe("https://cerulean.onrender.com");
  });

  it("refuses to guess in production", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("RENDER_EXTERNAL_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => appBaseUrl()).toThrow(/APP_URL/);
  });
});
