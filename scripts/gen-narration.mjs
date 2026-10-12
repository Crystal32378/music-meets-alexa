// Narrator voiceover for the demo video (NOT the Alexa voice on purpose).
// Voice: Polly Matthew (neural) — distinct from Danielle, who voices Alexa.
// Reads voiceover/script.md segments, writes voiceover/mp3/*.mp3 for Step 5.
// Usage: node scripts/gen-narration.mjs [--dry-run] [VOICE_ID=... ENGINE=...]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'voiceover', 'mp3');
const PROFILE = process.env.AWS_PROFILE || 'muse-spark';
const REGION = process.env.AWS_REGION || 'us-east-1';
const VOICE = process.env.VOICE_ID || 'Matthew';
const ENGINE = process.env.ENGINE || 'neural';
const DRY = process.argv.includes('--dry-run');

const md = fs.readFileSync(path.join(ROOT, 'voiceover', 'script.md'), 'utf8');
const parts = md.split(/^## (\S+).*$/m).slice(1);
const segs = [];
for (let i = 0; i + 1 < parts.length; i += 2) {
  const text = parts[i + 1].replace(/\s+/g, ' ').trim();
  if (text.length > 10) segs.push({ key: parts[i].replace(/^seg\d+-/, ''), text });
}
const words = segs.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
console.log(`Segments: ${segs.length}, words: ${words} (~${(words / 150).toFixed(1)} min @150wpm), voice ${VOICE}/${ENGINE}`);
if (DRY) {
  for (const s of segs) console.log(`  ${s.key}: ${s.text.slice(0, 60)}…`);
  process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
let ok = 0;
for (const s of segs) {
  const out = path.join(OUT, s.key + '.mp3');
  const r = spawnSync('aws', ['polly', 'synthesize-speech', '--profile', PROFILE, '--region', REGION,
    '--engine', ENGINE, '--voice-id', VOICE, '--output-format', 'mp3', '--text', s.text, out], { stdio: 'pipe' });
  if (r.status !== 0 || !fs.existsSync(out) || fs.statSync(out).size === 0) {
    console.error(`FAIL ${s.key}: ${r.stderr.toString().slice(0, 200)}`);
    process.exitCode = 1;
    continue;
  }
  ok++;
}
console.log(`Done: ${ok}/${segs.length} narration MP3s in voiceover/mp3/`);
