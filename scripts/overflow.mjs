import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3200";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await (await browser.newContext({ viewport: { width: 320, height: 700 }, reducedMotion: "reduce" })).newPage();
await page.goto(base + "/onboarding", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /données de démo/i }).click();
await page.waitForURL(base + "/");
for (const r of (process.env.ROUTES ?? "/progress,/status,/settings").split(",")) {
  await page.goto(base + r, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const res = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth + 1 && rect.width > 0) {
        let p = el.parentElement, clipped = false;
        while (p) { const s = getComputedStyle(p); if (s.overflowX === "auto" || s.overflowX === "hidden" || s.overflowX === "scroll") { clipped = true; break; } p = p.parentElement; }
        if (!clipped) out.push(`${el.tagName.toLowerCase()}.${(el.className?.baseVal ?? el.className ?? "").toString().slice(0, 90)} right=${Math.round(rect.right)} text="${(el.textContent ?? "").trim().slice(0, 40)}"`);
      }
    }
    return out.slice(0, 8);
  });
  console.log(`--- ${r}\n${res.join("\n")}`);
}
await browser.close();
