import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const svg = readFileSync("public/icons/icon.svg", "utf8");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage();
const render = async (size, out, pad = 0) => {
  await page.setViewportSize({ width: size, height: size });
  const inner = size - pad * 2;
  await page.setContent(`<html><body style="margin:0;background:#05070d;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">${svg.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</body></html>`);
  await page.screenshot({ path: out, omitBackground: false });
};
await render(192, "public/icons/icon-192.png");
await render(512, "public/icons/icon-512.png");
await render(512, "public/icons/icon-maskable-512.png", 56);
await render(180, "public/icons/apple-touch-icon.png");
await render(32, "public/favicon.png");
await browser.close();
console.log("icons ok");
