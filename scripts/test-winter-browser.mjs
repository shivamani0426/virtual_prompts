/**
 * Real-user smoke run against the deployed, public Winter Smog Assistant.
 * Uses ephemeral browser storage and no private account credentials.
 * One cited assistant question is asked; AI inference may be metered.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const URL = "https://winter-smog-web.1nc24cs197.workers.dev/";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [];
const log = (message) => process.stdout.write("PASS: " + message + "\n");

async function waitForText(locator, expected, timeout = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if ((await locator.textContent())?.trim() === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw Error("Expected " + JSON.stringify(expected) + " but got " + JSON.stringify(await locator.textContent()));
}

try {
  const context = await browser.newContext({ viewport: { width: 1365, height: 800 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.locator("#assistant").getByRole("heading", { name: "Ask about the air. Check the source." }).waitFor();
  await page.locator("#impact").getByRole("heading", { name: "Small actions, visible progress." }).waitFor();
  log("Assistant and impact are mounted on the live React dashboard");

  // Verify actual browser -> FastAPI -> model or evidence fallback -> browser citation.
  const assistant = page.locator("#assistant");
  await assistant.getByRole("button", { name: "What does WHO recommend for PM2.5?" }).click();
  await assistant.getByRole("link", { name: "Read official source" }).first().waitFor({ timeout: 110000 });
  const answer = (await assistant.locator(".assistant-answer-body").first().innerText()).toLowerCase();
  assert.match(answer, /pm2\.5|pm25|fine particles/);
  const official = await assistant.getByRole("link", { name: "Read official source" }).first().getAttribute("href");
  assert.ok(official?.startsWith("https://www.who.int/"), "Citation URL must be on WHO");
  const evidence = assistant.locator(".assistant-reviewed-evidence").first();
  await evidence.waitFor();
  assert.ok((await evidence.innerText()).length > 55, "Exact reviewed evidence must be visible");
  const mode = (await assistant.locator(".assistant-answer-mode").first().innerText()).toLowerCase();
  assert.match(mode, /ai paraphrase|reviewed source summaries/);
  log("Live assistant returns a relevant response, exact reviewed evidence and WHO citation");

  // Verify same-tab event propagation, save, reload, undo, and badge revocation.
  const planner = page.locator("#planner");
  const impact = page.locator("#impact");
  const count = impact.locator(".impact-stat").first().locator("strong");
  await waitForText(count, "0");
  await planner.getByRole("button", { name: "Mark done" }).first().click();
  await waitForText(count, "1");
  assert.match((await impact.locator(".impact-badge").first().innerText()), /unlocked/i);
  log("Completing one activity immediately increments impact and unlocks First Step");

  await page.reload({ waitUntil: "domcontentloaded" });
  const refreshed = page.locator("#impact");
  await waitForText(refreshed.locator(".impact-stat").first().locator("strong"), "1");
  await page.locator("#planner").getByRole("button", { name: "Completed" }).first().click();
  await waitForText(refreshed.locator(".impact-stat").first().locator("strong"), "0");
  assert.doesNotMatch((await refreshed.locator(".impact-badge").first().innerText()), /unlocked/i);
  log("Activity persists after reload; undo revokes impact and badge");

  // Check mobile layout without testing sensitive personal data or geolocation.
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true,
    deviceScaleFactor: 1, hasTouch: true,
  });
  const smallPage = await mobile.newPage();
  smallPage.on("pageerror", (error) => errors.push(error.message));
  await smallPage.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await smallPage.locator("#assistant").waitFor();
  await smallPage.locator("#impact").waitFor();
  const dimensions = await smallPage.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  assert.ok(dimensions.content <= dimensions.viewport + 2,
    "Unexpected mobile horizontal overflow " + JSON.stringify(dimensions));
  log("Mobile (390 px) layout exposes assistant and impact without page horizontal overflow");
  assert.deepEqual(errors, [], "React browser errors encountered");
  log("No uncaught browser JavaScript errors");
  await mobile.close();
  await context.close();
} finally {
  await browser.close();
}
