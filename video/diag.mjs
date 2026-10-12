import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.type(), m.text()));
await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
const diag = await page.evaluate(async () => {
  const out = {};
  const S = SONGS['demo-mika'];
  const sr = 44100, seconds = 26;
  const octx = new OfflineAudioContext(2, Math.ceil(sr * seconds), sr);
  out.beforeAudioCtxNull = (audioCtx === null);
  audioCtx = octx;
  masterGain = octx.createGain(); masterGain.gain.value = 0.9; masterGain.connect(octx.destination);
  noiseBuf = octx.createBuffer(1, sr, sr);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  out.afterSwapEq = (audioCtx === octx);
  const step = 60 / S.bpm / 4, N = 64, M = buildMaps(S), t0 = 0.12;
  let schedCount = 0;
  for (let rep = 0; rep < 2; rep++) for (let s = 0; s < N; s++) { scheduleStep(S, M, s % N, t0 + (rep * N + s) * step, step); schedCount++; }
  out.schedCount = schedCount;
  const buf = await octx.startRendering();
  const d = buf.getChannelData(0);
  let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  out.peak = peak; out.len = d.length;
  return out;
});
console.log(JSON.stringify(diag, null, 2));
await browser.close();
