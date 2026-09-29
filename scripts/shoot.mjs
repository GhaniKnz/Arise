import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3100";
const out = process.env.OUT;
const routes = (process.env.ROUTES ?? "/").split(",");
const widths = (process.env.WIDTHS ?? "390,1440").split(",").map(Number);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
await page.goto(base + "/onboarding", { waitUntil: "networkidle" });
if (process.env.SEED !== "0") {
  await page.getByRole("button", { name: /données de démo/i }).click();
  await page.waitForURL(base + "/", { timeout: 60000 });
  await page.waitForTimeout(1500);
}
for (const r of routes) {
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: w < 800 ? 844 : 900 });
    await page.goto(base + r, { waitUntil: "networkidle" });
    await page.waitForTimeout(Number(process.env.WAIT ?? 1200));
    // dismiss overlays if any
    const name = `${r.replace(/\//g, "_") || "_root"}-${w}.png`;
    await page.screenshot({ path: `${out}/${name}`, fullPage: process.env.FULL !== "0" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) errors.push(`overflow-x at ${r} ${w}px: ${await page.evaluate(() => document.documentElement.scrollWidth)}`);
  }
}
console.log(errors.length ? errors.join("\n") : "no errors");
await browser.close();
