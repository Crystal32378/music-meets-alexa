// Render each generative loop to WAV using the page's OWN synth functions via
// OfflineAudioContext (deterministic, silent, no live playback). We swap the
// page globals (audioCtx/masterGain/noiseBuf) to an offline context, then call
// the page's real buildMaps()/scheduleStep() twice (2 bars x2 = the app's loop).
import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = process.env.SIM_URL || 'http://localhost:8080/';
const OUT = process.argv[2] || 'video/audio';
const SECONDS = Number(process.env.LOOP_SECONDS || 26);

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });

const songs = ['demo-mika', 'demo-jules', 'demo-noah', 'demo-robin', 'demo-theo', 'demo-ren'];
fs.mkdirSync(OUT, { recursive: true });

for (const id of songs) {
  const b64 = await page.evaluate(async ({ id, seconds }) => {
    const S = SONGS[id];
    if (!S) return null;
    const sr = 44100;
    const octx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, Math.ceil(sr * seconds), sr);
    // Swap the page's bare globals to offline versions; tone/kick/noise read them.
    const prevCtx = audioCtx, prevGain = masterGain, prevNoise = noiseBuf;
    audioCtx = octx;
    masterGain = octx.createGain(); masterGain.gain.value = 0.9; masterGain.connect(octx.destination);
    noiseBuf = octx.createBuffer(1, sr, sr);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    const step = 60 / S.bpm / 4, N = 64, M = buildMaps(S), t0 = 0.12;
    for (let rep = 0; rep < 2; rep++)
      for (let s = 0; s < N; s++) scheduleStep(S, M, s % N, t0 + (rep * N + s) * step, step);

    const buf = await octx.startRendering();
    const ch = buf.numberOfChannels, len = buf.length;
    const data = new Int16Array(len * ch);
    for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
      let v = buf.getChannelData(c)[i]; v = Math.max(-1, Math.min(1, v));
      data[i * ch + c] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    let bin = '';
    const u8 = new Uint8Array(data.buffer);
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    Object.assign(globalThis, {}); // no-op keep
    audioCtx = prevCtx; masterGain = prevGain; noiseBuf = prevNoise;
    return btoa(bin);
  }, { id, seconds: SECONDS });

  if (!b64) { console.error('no song', id); continue; }
  const pcm = Buffer.from(b64, 'base64');
  const sr = 44100, ch = 2, bits = 16;
  const byteRate = sr * ch * bits / 8, blockAlign = ch * bits / 8, dataSize = pcm.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + dataSize, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(ch, 22);
  header.writeUInt32LE(sr, 24); header.writeUInt32LE(byteRate, 28); header.writeUInt16LE(blockAlign, 32); header.writeUInt16LE(bits, 34);
  header.write('data', 36); header.writeUInt32LE(dataSize, 40);
  fs.writeFileSync(`${OUT}/${id}.wav`, Buffer.concat([header, pcm]));
  console.log(`wrote ${id}.wav (${(dataSize / byteRate).toFixed(1)}s)`);
}

await browser.close();
console.log('done');
