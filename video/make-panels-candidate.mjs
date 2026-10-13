// CANDIDATE panels — identical to make-panels.mjs except the hear panel subline.
// Murphy finding: "zero copyright risk" is an unverifiable marketing claim.
// Replaced with a concrete, checkable description of the actual music source
// (WebAudio-synthesized original music — see data/profiles.js previewTone).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'video/panels-candidate';
const W = 512, H = 720;
fs.mkdirSync(OUT, { recursive: true });

const PANELS = {
  meet:    { label: '01 · DAILY BRIEF',       headline: 'Three people, chosen for your intention', subline: 'MCP tool get_daily_brief · friend & lover kept separate' },
  hear:    { label: '02 · TWO-LAYER PRIVACY', headline: 'A teaser aloud, the full card on your screen', subline: 'Original music, synthesized live in your browser with WebAudio' },
  why:     { label: '03 · WHY THIS MATCH',    headline: 'Two honest reasons, one open unknown', subline: 'explain_match · grounded reasons, never a score' },
  privacy: { label: '04 · YOUR PROFILE',      headline: 'Your music profile never leaves this browser', subline: 'localStorage only · the server gets a yes-flag, never your name' },
  yeses:   { label: '05 · CONSENT BY DESIGN', headline: 'Two yeses before anything is saved', subline: 'save_interest · stays Pending · nobody is contacted' },
  tech:    { label: '06 · UNDER THE HOOD',    headline: 'A real MCP server, six tools', subline: 'MCP 2025-11-25 · Streamable HTTP · JSON-RPC · 15 tests green' },
};const GRAIN = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E";

function panelHTML(p) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
    body{background:#F5F5F5;color:#16130f;font-family:"Bree Serif",Georgia,"Songti TC",serif;
      padding:0 44px;box-sizing:border-box;position:relative}
    body::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.05;background-image:url("${GRAIN}")}
    /* top bar: wordmark (left) + badge icon (right) */
    .topbar{position:absolute;top:40px;left:44px;right:44px;display:flex;align-items:center;justify-content:space-between}
    .wordmark{font-family:"bely-display","Bree Serif",Georgia,serif;font-size:30px;font-weight:700;
      letter-spacing:-0.01em;color:#16130f;line-height:1}
    .badge{flex:none;width:74px;height:74px;border-radius:50%;background:#16130f;border:3px solid #FF3200;
      position:relative;display:flex;align-items:center;justify-content:center}
    .badge::after{content:"";width:34px;height:34px;border-radius:50%;background:#FF3200}
    .badge::before{content:"";position:absolute;width:7px;height:7px;border-radius:50%;background:#F5F5F5;z-index:2}
    .stack{position:absolute;left:44px;right:44px;top:170px}
    .label{font-family:Jost,system-ui,sans-serif;font-size:15px;font-weight:700;letter-spacing:.16em;
      text-transform:uppercase;color:#FF3200}
    .rule{width:64px;height:3px;background:#FF3200;margin:18px 0 26px}
    .headline{font-size:40px;line-height:1.12;font-weight:400;letter-spacing:-0.01em;margin:0}
    .subline{font-family:Jost,system-ui,sans-serif;font-size:24px;line-height:1.4;color:#6f6960;margin:26px 0 0}
  </style></head><body>
    <div class="topbar">
      <div class="wordmark">Music Meets<br>Alexa</div>
      <div class="badge"></div>
    </div>
    <div class="stack">
      <div class="label">${p.label}</div>
      <div class="rule"></div>
      <h2 class="headline">${p.headline}</h2>
      <p class="subline">${p.subline}</p>
    </div>
  </body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (const [key, p] of Object.entries(PANELS)) {
  await page.setContent(panelHTML(p), { waitUntil: 'load' });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(OUT, `${key}.png`) });
  console.log('wrote', `${key}.png`);
}
// Favicon: 180x180 crop of the badge on paper background.
const faviconHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:180px;height:180px;background:#F5F5F5}
  .b{position:absolute;inset:15px;border-radius:50%;background:#16130f;border:5px solid #FF3200;
     display:flex;align-items:center;justify-content:center}
  .b::after{content:"";width:52px;height:52px;border-radius:50%;background:#FF3200}
  .b::before{content:"";position:absolute;width:11px;height:11px;border-radius:50%;background:#F5F5F5;z-index:2}
</style></head><body><div class="b"></div></body></html>`;
await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(faviconHTML, { waitUntil: 'load' });
await page.waitForTimeout(100);
await page.screenshot({ path: path.join(OUT, 'favicon.png') });
console.log('wrote favicon.png (180x180)');
await browser.close();
console.log('panels + favicon done');
