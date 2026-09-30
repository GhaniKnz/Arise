// End-to-end smoke test of the main flows against a running server.
import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3200";
const out = process.env.OUT ?? ".";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && !m.text().includes("Failed to load resource") && errors.push(`console: ${m.text()}`));
const step = async (name, fn) => {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.log(`✗ ${name}: ${e.message.split("\n")[0]}`);
    await page.screenshot({ path: `${out}/fail-${name.replace(/\W+/g, "_")}.png` });
    errors.push(`${name}: ${e.message.split("\n")[0]}`);
  }
};

await step("onboarding", async () => {
  await page.goto(`${base}/onboarding`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Commencer l'éveil/ }).click();
  await page.getByLabel("Prénom").fill("Test");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: /Perdre du gras/ }).first().click();
  await page.getByRole("button", { name: "Continuer" }).click(); // goal
  await page.getByRole("button", { name: "Continuer" }).click(); // body
  await page.getByRole("button", { name: "Continuer" }).click(); // target
  await page.getByRole("button", { name: "Continuer" }).click(); // activity
  await page.getByRole("button", { name: "Continuer" }).click(); // training
  await page.getByText("Évaluation du Système").waitFor();
  await page.getByRole("button", { name: "ARISE", exact: true }).click();
  await page.waitForURL(`${base}/`);
  await page.getByRole("heading", { name: /Test/ }).waitFor();
});

await step("add food via search", async () => {
  await page.goto(`${base}/nutrition/add?meal=lunch`, { waitUntil: "networkidle" });
  await page.getByLabel("Rechercher un aliment").fill("poulet grillé");
  await page.getByRole("button", { name: /Blanc de poulet grillé/ }).first().click();
  await page.getByRole("button", { name: /Ajouter · / }).click();
  await page.goto(`${base}/nutrition`, { waitUntil: "networkidle" });
  await page.getByText("Blanc de poulet grillé (cuit)").waitFor();
});

await step("quick weight + water", async () => {
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Ajouter : repas/ }).click();
  await page.getByRole("button", { name: "Ajouter poids" }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByText("Pesée enregistrée").waitFor();
  await page.getByRole("button", { name: "Ajouter 250 ml d'eau" }).click();
});

await step("workout session", async () => {
  await page.goto(`${base}/session`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Séance libre" }).click();
  await page.getByRole("button", { name: /Ajouter un exercice/ }).first().click();
  await page.getByLabel("Rechercher un exercice").fill("développé couché");
  await page.getByRole("button", { name: /^Développé couché Pectoraux/ }).first().click();
  await page.getByLabel("Charge série 1 en kg").fill("60");
  await page.getByLabel("Répétitions série 1").fill("10");
  await page.getByRole("button", { name: "Valider la série 1" }).click();
  await page.getByRole("timer").waitFor();
  await page.getByRole("button", { name: "Passer le repos" }).click();
  await page.getByRole("button", { name: "Terminer" }).click();
  await page.getByRole("button", { name: "Valider la séance" }).click();
  await page.waitForURL(/\/workout\/history\//);
  await page.getByText("SÉANCE TERMINÉE").waitFor();
});

await step("edit past session", async () => {
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  await page.getByText("Mode édition").waitFor();
  const sets = () => page.getByRole("button", { name: /^Options de la série/ }).count();
  await page.getByRole("button", { name: "Série", exact: true }).first().click();
  await page.getByRole("button", { name: "Options de la série 2" }).waitFor();
  await page.getByRole("button", { name: "Retirer une série" }).first().click();
  await page.getByRole("button", { name: "Annuler", exact: true }).waitFor();
  if ((await sets()) !== 1) throw new Error(`expected 1 set, got ${await sets()}`);
  await page.getByRole("button", { name: /Ajouter un exercice/ }).click();
  await page.getByLabel("Rechercher un exercice").fill("tractions");
  await page.getByRole("button", { name: /^Tractions/ }).first().click();
  await page.getByRole("heading", { name: "Tractions", exact: true }).waitFor();
  await page.getByRole("button", { name: /Nom, date, durée/ }).click();
  await page.getByLabel("Nom").fill("Pecs du matin");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("heading", { name: "Pecs du matin" }).waitFor();
  await page.getByRole("button", { name: "Retirer Tractions de la séance" }).click();
  await page.getByRole("button", { name: "Retirer", exact: true }).click();
  await page.getByRole("heading", { name: "Tractions", exact: true }).waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Terminer" }).click();
  await page.getByRole("button", { name: "Modifier", exact: true }).waitFor();
});

await step("add forgotten session from history", async () => {
  await page.goto(`${base}/workout/history`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Séance passée" }).first().click();
  await page.getByRole("button", { name: "Avant-hier" }).click();
  await page.getByRole("button", { name: /^Séance libre/ }).click();
  await page.getByLabel("Nom", { exact: true }).fill("Séance oubliée");
  await page.getByRole("button", { name: /Créer et remplir/ }).click();
  await page.waitForURL(/\/workout\/history\/.+\?edit=1/);
  await page.getByRole("heading", { name: "Séance oubliée" }).waitFor();
  await page.getByText("Mode édition").waitFor();
});

await step("exercise instructions", async () => {
  await page.goto(`${base}/workout/exercises`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Créer/ }).first().click();
  await page.getByLabel("Nom", { exact: true }).fill("Squat test e2e");
  await page.getByRole("button", { name: "Ajouter une étape" }).click();
  await page.getByLabel("Étape 1", { exact: true }).fill("Pieds largeur d'épaules");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/workout\/exercises\/.+/);
  await page.locator("#main").getByText("Pieds largeur d'épaules").waitFor();
});

await step("pages render", async () => {
  for (const r of ["/workout", "/progress", "/progress?tab=photos", "/calendar", "/analytics", "/status", "/knowledge", "/report", "/coach", "/settings", "/workout/exercises", "/nutrition/library", "/nutrition/barcode"]) {
    await page.goto(`${base}${r}`, { waitUntil: "networkidle" });
    await page.locator("main h1").first().waitFor({ timeout: 8000 });
  }
});

await step("API barcode (Open Food Facts)", async () => {
  const res = await page.request.get(`${base}/api/food/barcode/3017620422003`);
  const body = await res.json();
  if (!res.ok() || !body.food?.kcal) throw new Error(`status ${res.status()} ${JSON.stringify(body).slice(0, 120)}`);
});

await step("API search (Open Food Facts)", async () => {
  const res = await page.request.get(`${base}/api/food/search?q=skyr`);
  const body = await res.json();
  if (!res.ok() || !body.foods?.length) throw new Error(`status ${res.status()} ${JSON.stringify(body).slice(0, 120)}`);
});

await step("API AI without key returns 503", async () => {
  const res = await page.request.post(`${base}/api/ai/coach`, { data: { messages: [{ role: "user", content: "salut" }], context: "x" } });
  if (res.status() !== 503) throw new Error(`status ${res.status()}`);
});

console.log(errors.length ? `\nERRORS:\n${errors.join("\n")}` : "\nALL GOOD");
await browser.close();
