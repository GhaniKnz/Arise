import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3200";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await (await browser.newContext({ viewport: { width: 320, height: 700 }, reducedMotion: "reduce" })).newPage();
await page.goto(base + "/onboarding", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /données de démo/i }).click();
await page.waitForURL(base + "/");
for (const r of (process.env.ROUTES ?? "/progress,/status,/settings").split(",")) {
  // "@history" = latest finished session (in edit mode).
  let path = r;
  if (r === "@history") {
    await page.goto(base + "/workout", { waitUntil: "networkidle" });
    path = (await page.locator('a[href^="/workout/history/"]').first().getAttribute("href")) + "?edit=1";
  }
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const res = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth + 1 && rect.width > 0) {
        let p = el.parentElement, clipped = false;
        while (p) { const s = getComputedStyle(p); if (["auto", "hidden", "scroll", "clip"].includes(s.overflowX)) { clipped = true; break; } p = p.parentElement; }
        if (!clipped) out.push(`${el.tagName.toLowerCase()}.${(el.className?.baseVal ?? el.className ?? "").toString().slice(0, 90)} right=${Math.round(rect.right)} text="${(el.textContent ?? "").trim().slice(0, 40)}"`);
      }
    }
    return out.slice(0, 8);
  });
  console.log(`--- ${r}\n${res.join("\n")}`);
}
await browser.close();
