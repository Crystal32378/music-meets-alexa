// Record the "tech" terminal scene as a silent webm at 768x720 (left 60%).
// Real captured output (server banner, 15 PASS lines, 6 tools), typewriter style.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'video/raw';
const W = 768, H = 720;

const banner = [
  '[music-meets-alexa] MCP Streamable HTTP on http://localhost:8080/mcp (spec 2025-11-25)',
  '[music-meets-alexa] Alexa+ simulator on http://localhost:8080/',
];
const smoke = [
  'PASS  health ok + renamed',
  'PASS  initialize 2025-11-25 + session',
  'PASS  6 tools listed',
  'PASS  brief: voice + 3 screen cards + icebreakers + label data + lineup',
  'PASS  teaser by default (no location on screen)',
  'PASS  full card only with explicit full:true',
  'PASS  save refused without profile attestation',
  'PASS  save step 1 asks confirmation',
  'PASS  save step 2 stores Pending',
  'PASS  save refused for unchosen intention (Noah is friend-only)',
  'PASS  step 2 without step 1 refused (CONFIRM_ORDER)',
  'PASS  mood tracks (warm >= 2)',
  'PASS  six-person cast (Theo full card)',
  'PASS  Ren open to lover',
  'PASS  ineligible intention handled',
  '',
  'All smoke tests passed.',
];
const tools = ['get_daily_brief', 'get_profile_detail', 'explain_match', 'propose_mixtape_opener', 'recommend_tracks_for_mood', 'save_interest'];

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#0c0a12;height:100%;overflow:hidden}
  #term{font-family:"SF Mono",Menlo,Monaco,monospace;font-size:12.5px;line-height:1.42;
    color:#e8e6df;padding:16px 20px;white-space:pre-wrap;word-break:break-word}
  .bar{position:fixed;top:0;left:0;right:0;height:26px;background:#1c1a22;display:flex;align-items:center;gap:7px;padding:0 12px}
  .dot{width:11px;height:11px;border-radius:50%}
  .r{background:#ff5f57}.y{background:#febc2e}.g{background:#28c840}
  .ttl{margin-left:10px;color:#8a8892;font-size:11px;font-family:-apple-system,sans-serif}
  .p{color:#7bd88f}.ok{color:#7bd88f}.dim{color:#8a8892}.cmd{color:#fff;font-weight:600}
  .cursor{display:inline-block;width:8px;height:16px;background:#e8e6df;vertical-align:-2px;animation:blink 1s steps(1) infinite}
  @keyframes blink{50%{opacity:0}}
  body{padding-top:26px}
</style></head><body>
<div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span class="ttl">crystalchang \u2014 music-meets-alexa</span></div>
<div id="term"></div>
<script>
const SCRIPT = ${JSON.stringify([
  { t: 'prompt', cmd: 'npm start' },
  { t: 'out', lines: banner },
  { t: 'pause', ms: 800 },
  { t: 'prompt', cmd: 'npm run test:mcp' },
  { t: 'out', lines: smoke, cls: 'ok' },
  { t: 'pause', ms: 600 },
  { t: 'comment', text: '# MCP Inspector -> tools/list (real JSON-RPC to POST /mcp)' },
  { t: 'prompt', cmd: 'curl -s localhost:8080/mcp -d @tl.json | jq .result.tools[].name' },
  { t: 'out', lines: tools.map((x) => '- ' + x), cls: 'ok' },
])};
const term = document.getElementById('term');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function el(html, cls){const d=document.createElement('span'); if(cls)d.className=cls; d.innerHTML=html; return d;}
async function typeCmd(cmd){
  const line=document.createElement('div');
  line.appendChild(el('<span class="p">></span> '));
  const cs=document.createElement('span'); cs.className='cmd'; line.appendChild(cs);
  const cur=document.createElement('span'); cur.className='cursor'; line.appendChild(cur);
  term.appendChild(line);
  for(const ch of cmd){ cs.textContent+=ch; await sleep(30); }
  cur.remove();
}
async function printLines(lines, cls){
  for(const ln of lines){ const d=document.createElement('div'); d.className=cls||''; d.textContent=ln||' '; term.appendChild(d); await sleep(cls==='ok'?110:80); }
}
(async () => {
  await sleep(400);
  for(const step of SCRIPT){
    if(step.t==='prompt'){ await sleep(180); await typeCmd(step.cmd); await sleep(140); }
    else if(step.t==='out'){ await printLines(step.lines, step.cls); }
    else if(step.t==='comment'){ const d=document.createElement('div'); d.className='dim'; d.textContent=step.text; term.appendChild(d); await sleep(260); }
    else if(step.t==='pause'){ await sleep(step.ms); }
  }
  const end=document.createElement('div'); end.innerHTML='<span class="p">></span> <span class="cursor"></span>'; term.appendChild(end);
  window.__done=true;
})();
</script></body></html>`;

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: OUT, size: { width: W, height: H } } });
const page = await ctx.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.waitForFunction('window.__done === true', null, { timeout: 60000 });
await page.waitForTimeout(1400);
const video = page.video();
await ctx.close();
const p = await video.path();
const dest = path.join(OUT, 'tech.webm');
try { fs.renameSync(p, dest); } catch {}
console.log('recorded tech @768x720');
await browser.close();
