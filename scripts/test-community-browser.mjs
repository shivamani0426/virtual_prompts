/**
 * Live community end-user acceptance: temporary pseudonymous browser session.
 * Creates a clearly labelled inert QA report, verifies it never becomes public,
 * and permanently deletes it before exit (including on test failure).
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const site = "https://winter-smog-web.1nc24cs197.workers.dev/";
const api = "https://winter-smog-community.1nc24cs197.workers.dev";
const description = "Automated QA demonstration only, not a real pollution incident. This is a temporary test and must not be approved.";
const browser = await chromium.launch({ headless:true, args:["--no-sandbox"] });
const errors = [];
let context;
let page;

function pass(text) { console.log("PASS community browser: " + text); }
async function cleanup() {
  if (!page) return;
  try {
    const stored = await page.evaluate(() => localStorage.getItem("winter-smog:community-session-v1"));
    const token = JSON.parse(stored || "null")?.token;
    if (!/^[a-f0-9]{64}$/.test(token || "")) return;
    const headers = { Authorization: "Bearer " + token, Accept:"application/json" };
    const my = await fetch(api + "/my/reports", { headers });
    if (!my.ok) throw Error("Could not inspect own pending smoke reports: " + my.status);
    const data = await my.json();
    for (const r of data.reports || []) {
      if (r.description !== description) continue;
      const erased = await fetch(api + "/my/reports/" + r.id, {method:"DELETE",headers});
      if (!erased.ok || !(await erased.json()).deleted) throw Error("Could not erase QA report " + r.id);
      pass("Temporary smoke report permanently removed from D1");
    }
    const after = await fetch(api + "/my/reports", {headers});
    const remaining = await after.json();
    assert.equal((remaining.reports || []).filter(r => r.description === description).length, 0);
  } catch (e) {
    console.error("Community smoke cleanup failed:", e);
    process.exitCode = 1;
  }
}

try {
  context = await browser.newContext({viewport:{width:1365,height:900}});
  page = await context.newPage();
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(site,{waitUntil:"domcontentloaded",timeout:90000});
  const hub=page.locator("#community");
  await hub.getByRole("heading",{name:/Cleaner air, together/}).waitFor({timeout:25000});
  await hub.locator(".community-challenge").first().getByRole("button",{name:"Join challenge"}).waitFor({timeout:35000});
  assert.equal(await hub.locator(".community-challenge").count(),3);
  pass("React website connects to live D1 and renders three community challenges");

  await hub.getByRole("textbox",{name:/Observation/}).fill(description);
  await hub.getByRole("button",{name:"Submit for review"}).click();
  await hub.getByText(/awaiting human moderation/).waitFor({timeout:30000});
  const yourReports=hub.locator(".community-pane").first();
  await yourReports.getByText(description).waitFor({timeout:30000});
  assert.equal(await hub.locator(".community-pane").nth(1).getByText(description).count(),0,
    "A new pending report must never be shown as approved");
  pass("Report creates pending record, appears only to sender, not to public feed");

  const first=hub.locator(".community-challenge").first();
  await first.getByRole("button",{name:"Join challenge"}).click();
  await first.getByRole("button",{name:"Log today's activity"}).waitFor({timeout:20000});
  await first.getByRole("button",{name:"Log today's activity"}).click();
  await first.getByText("1 / 3 days").waitFor({timeout:20000});
  pass("Challenge joins and records exactly one reported day");

  await hub.getByRole("button",{name:"Save alerts"}).click();
  await hub.getByText(/Alert choices saved/).waitFor({timeout:20000});
  await hub.getByRole("button",{name:"Check air now"}).click();
  const alertResult=hub.locator(".community-alert [role='status']").first();
  await alertResult.waitFor({timeout:20000});
  assert.match(await alertResult.innerText(),/Alerts are opt-in|No fresh threshold alert/i);
  pass("Disabled air alerts stay disabled and do not invent an AQI notification");

  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator("#community").locator(".community-pane").first().getByText(description).waitFor({timeout:30000});
  await page.locator("#community").locator(".community-challenge").first().getByText("1 / 3 days").waitFor({timeout:20000});
  pass("Own report and challenge check-in persist across page reload");
  
  await page.locator("#community").locator(".community-pane").first()
    .getByRole("button",{name:"Remove my report"}).click();
  await page.locator("#community").getByText("Your report was removed.").waitFor({timeout:20000});
  assert.equal(await page.locator("#community").getByText(description).count(),0,
    "The removed test report should not appear in browser UI");
  pass("User deletion removes own report from browser");
  await cleanup();

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
    const small=await mobile.newPage();
    small.on("pageerror",error=>errors.push(error.message));
    await small.goto(site,{waitUntil:"domcontentloaded",timeout:90000});
    await small.locator("#community").getByRole("heading",{name:/Cleaner air, together/}).waitFor();
    const dims=await small.evaluate(()=>({
      viewport:document.documentElement.clientWidth,
      content:document.documentElement.scrollWidth,
    }));
    assert.ok(dims.content<=dims.viewport+2,
      "Community mobile page horizontal overflow "+JSON.stringify(dims));
    pass("Community section loads on 390px mobile viewport without horizontal overflow");
  }finally{await mobile.close();}
  assert.deepEqual(errors,[],"Uncaught frontend JavaScript exception");
  pass("No uncaught browser JavaScript errors");
} finally {
  await cleanup();
  await context?.close();
  await browser.close();
}
