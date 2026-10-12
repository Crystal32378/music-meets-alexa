// Record the browser scenes as SILENT webm at 768x720 (left 60% of the 60/40 layout).
// Playwright records video only; site sound is mixed in post. Drives the sim via
// the text input (app's native fallback; no mic). Kept for reproducibility.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = process.env.SIM_URL || 'http://localhost:8080/';
const OUT = process.argv[2] || 'video/raw';
const W = 768, H = 720;
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function recordScene(name, fn) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: OUT, size: { width: W, height: H } },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.error(`[${name}]`, m.text()); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await fn(page);
  const video = page.video();
  await ctx.close();
  if (video) {
    const p = await video.path();
    const dest = path.join(OUT, `${name}.webm`);
    try { fs.renameSync(p, dest); } catch { /* already moved */ }
    console.log(`recorded ${name}`);
  }
}

async function say(page, text, waitMs = 1200) {
  const before = await page.$$eval('#setlist > li', (ls) => ls.length);
  await page.fill('#input', text);
  await page.press('#input', 'Enter');
  await page.waitForFunction((n) => document.querySelectorAll('#setlist > li').length > n, before, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(waitMs);
}

// meet: brew friend brief -> 3 cards
await recordScene('meet', async (page) => {
  await page.click('#cta');
  await page.waitForTimeout(2600);
  await page.evaluate(() => document.getElementById('setlist').scrollIntoView());
  await page.waitForTimeout(1400);
});

// hear: tell me about Mika -> full card -> tap label -> music
await recordScene('hear', async (page) => {
  await say(page, 'brew my friend brief', 1800);
  await say(page, 'tell me about Mika', 1800);
  await say(page, "show Mika's full profile", 2200);
  const badge = page.locator('[data-play="demo-mika"]').first();
  if (await badge.count()) await badge.click();
  await page.waitForTimeout(6000);
});

// why: why Jules -> reasons + uncertainty + opener
await recordScene('why', async (page) => {
  await say(page, 'why Jules', 3000);
  await page.evaluate(() => document.getElementById('setlist').scrollIntoView());
  await page.waitForTimeout(1400);
});

// privacy: set up my profile -> 4-step flow
await recordScene('privacy', async (page) => {
  await say(page, 'set up my profile', 1100);
  await say(page, 'Alex', 1100);
  await say(page, 'yes', 1100);
  await say(page, 'friend', 1400);
  await say(page, 'mellow warm', 1800);
  await say(page, 'yes', 2200);
  await page.evaluate(() => document.getElementById('setlist').scrollIntoView());
  await page.waitForTimeout(1100);
});

// yeses: save interest in Mika -> confirm -> Pending
await recordScene('yeses', async (page) => {
  await say(page, 'set up my profile', 900);
  await say(page, 'Alex', 800);
  await say(page, 'yes', 800);
  await say(page, 'friend', 1100);
  await say(page, 'mellow warm', 1300);
  await say(page, 'yes', 1300);
  await say(page, 'save interest in Mika', 2200);
  await say(page, 'Yes, save it', 3200);
  await page.evaluate(() => document.getElementById('setlist').scrollIntoView());
  await page.waitForTimeout(1300);
});

await browser.close();
console.log('all browser scenes recorded @768x720');
