// Screenshot specific elements after loading demo data: ROUTE, SEL (comma list of selectors), OUT dir, WIDTH.
import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3200";
const out = process.env.OUT ?? ".";
const width = Number(process.env.WIDTH ?? 390);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await (await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, reducedMotion: "reduce" })).newPage();
await page.goto(base + "/onboarding", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /données de démo/i }).click();
await page.waitForURL(base + "/", { timeout: 60000 });
await page.waitForTimeout(1500);
for (const step of (process.env.STEPS ?? "/|section").split(";")) {
  const [route, sel, name] = step.split("|");
  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  // Dismiss any overlay (boss / level up) first.
  const overlay = page.getByRole("alertdialog");
  if (await overlay.count()) { await overlay.first().click(); await page.waitForTimeout(600); }
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: `${out}/${name ?? "el"}.png` });
}
await browser.close();
