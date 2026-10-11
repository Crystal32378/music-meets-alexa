// Generates pre-rendered voice lines with Amazon Polly (AWS Builder integration).
// The simulator prefers these MP3s and falls back to browser speech synthesis.
// Usage:
//   node scripts/gen-voice.mjs --dry-run            # list lines + cost estimate
//   node scripts/gen-voice.mjs                      # synthesize everything
//   VOICE_ID=Ruth ENGINE=neural node scripts/gen-voice.mjs
// Env: AWS_PROFILE (default muse-spark), AWS_REGION (default us-east-1).
// Lines come from the REAL server via MCP tools/call, so MP3s always match
// what the UI would speak. Key scheme mirrors voiceKey() in public/index.html.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profiles } from '../data/profiles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const AUDIO = path.join(ROOT, 'public', 'audio');
const PORT = 8097;
const BASE = `http://localhost:${PORT}`;
const PROFILE = process.env.AWS_PROFILE || 'muse-spark';
const REGION = process.env.AWS_REGION || 'us-east-1';
const VOICE = process.env.VOICE_ID || 'Danielle';
const ENGINE = process.env.ENGINE || 'neural';
const DRY = process.argv.includes('--dry-run');
const LIMIT = Number((process.argv.find((a) => a.startsWith('--limit=')) || '=').split('=')[1] || Infinity);

function voiceKey(tool, args, data) {
  if (tool === 'get_daily_brief') return 'brief__' + args.intention + '__' + (data && data.lineup != null ? data.lineup : 'x');
  if (tool === 'get_profile_detail') return 'profile__' + args.profileId + (args.full ? '__full' : '');
  if (tool === 'explain_match') return 'explain__' + args.profileId + '__' + args.intention;
  if (tool === 'propose_mixtape_opener') return 'mix__' + args.profileId + '__' + args.intention;
  if (tool === 'recommend_tracks_for_mood') return 'mood__' + args.mood;
  if (tool === 'save_interest') {
    if (data.needProfile) return 'save__needprofile';
    if (data.eligible === false) return 'save__ineligible__' + args.profileId;
    if (data.error === 'CONFIRM_ORDER') return 'save__confirmorder';
    if (data.confirmRequired) return 'save__' + args.profileId + '__' + args.intention + '__step1';
    if (data.saved) return 'save__' + args.profileId + '__' + args.intention + '__step2';
  }
  return null;
}
const safe = (k) => k.replace(/[^a-z0-9_-]+/gi, '_');

async function rpc(method, params = {}, session) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  if (session) headers['Mcp-Session-Id'] = session;
  const r = await fetch(`${BASE}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  return { res: r, json: await r.json(), session: r.headers.get('mcp-session-id') };
}
const call = (s, name, args) =>
  rpc('tools/call', { name, arguments: args }, s).then(({ json }) => JSON.parse(json.result.content[0].text));

const server = spawn('node', ['server.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore', cwd: ROOT });
let ready = false;
for (let i = 0; i < 50; i++) {
  try {
    const r = await fetch(`${BASE}/health`);
    if (r.ok) { ready = true; break; }
  } catch {}
  await new Promise((r) => setTimeout(r, 200));
}
if (!ready) { console.error('server never came up'); server.kill(); process.exit(1); }

const lines = new Map(); // key -> text
try {
  const init = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'gen-voice', version: '0' } });
  const s = init.session;
  // All daily rotations: friend has 5 lineups, lover 4. Walk day by day until
  // every lineup's voice is captured, so pre-recorded audio never names
  // yesterday's people.
  for (const intention of ['friend', 'lover']) {
    const seen = new Set();
    const target = intention === 'lover' ? 4 : 5;
    for (let day = 0; day < 60 && seen.size < target; day++) {
      const dt = new Date(Date.UTC(2026, 9, 11) + day * 86400000).toISOString().slice(0, 10);
      const args = { intention, daySeed: dt };
      const d = await call(s, 'get_daily_brief', args);
      if (!seen.has(d.lineup)) { seen.add(d.lineup); lines.set(voiceKey('get_daily_brief', args, d), d.voice); }
    }
    if (seen.size < target) throw new Error('only found ' + seen.size + '/' + target + ' ' + intention + ' lineups');
  }
  for (const p of profiles) {
    const teaser = await call(s, 'get_profile_detail', { profileId: p.id });
    lines.set(voiceKey('get_profile_detail', { profileId: p.id }, teaser), teaser.voice);
    const full = await call(s, 'get_profile_detail', { profileId: p.id, full: true });
    lines.set(voiceKey('get_profile_detail', { profileId: p.id, full: true }, full), full.voice);
  }
  for (const p of profiles) {
    for (const intention of ['friend', 'lover']) {
      const m = await call(s, 'explain_match', { profileId: p.id, intention });
      lines.set(voiceKey('explain_match', { profileId: p.id, intention }, m), m.voice);
      const mix = await call(s, 'propose_mixtape_opener', { profileId: p.id, intention });
      lines.set(voiceKey('propose_mixtape_opener', { profileId: p.id, intention }, mix), mix.voice);
      const s1 = await call(s, 'save_interest', { profileId: p.id, intention, profileConfirmed: true });
      lines.set(voiceKey('save_interest', { profileId: p.id, intention, profileConfirmed: true }, s1), s1.voice);
      if (s1.confirmRequired) {
        const s2 = await call(s, 'save_interest', { profileId: p.id, intention, profileConfirmed: true, confirmed: true });
        lines.set(voiceKey('save_interest', { profileId: p.id, intention, profileConfirmed: true, confirmed: true }, s2), s2.voice);
      }
    }
  }
  for (const mood of ['mellow', 'dreamy', 'warm', 'groovy']) {
    const d = await call(s, 'recommend_tracks_for_mood', { mood });
    lines.set(voiceKey('recommend_tracks_for_mood', { mood }, d), d.voice);
  }
  // needProfile must use a FRESH session: any prior profileConfirmed call
  // in this session would have attested the ledger already.
  const init3 = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'gen-voice-3', version: '0' } });
  const np = await call(init3.session, 'save_interest', { profileId: 'demo-mika', intention: 'friend' });
  lines.set(voiceKey('save_interest', { profileId: 'demo-mika', intention: 'friend' }, np), np.voice);
  const init2 = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'gen-voice-2', version: '0' } });
  const skip = await call(init2.session, 'save_interest', { profileId: 'demo-jules', intention: 'friend', profileConfirmed: true, confirmed: true });
  lines.set(voiceKey('save_interest', { profileId: 'demo-jules', intention: 'friend', profileConfirmed: true, confirmed: true }, skip), skip.voice);

  // Static client-side spoken lines (must match public/index.html verbatim).
  const statics = {
    greeting: 'Morning. No rush. Say brew my friend brief whenever you’re ready.',
    setup_name: 'Take your time. What should I call you?',
    setup_adult: 'Are you 18 or older?',
    setup_intention: 'Friend, lover, or both?',
    setup_moods: 'Pick your moods: mellow, dreamy, warm, groovy.',
    setup_consent: 'May I include you in discovery?',
    setup_minor: 'This demo is for adults only.',
    setup_cancel: 'Cancelled. Nothing saved.',
  };
  for (const [k, v] of Object.entries(statics)) lines.set(k, v);
  for (const p of profiles) {
    lines.set('announce__' + p.id, `That’s ${p.displayName}’s kind of music. Want to know a little more?`);
  }
} finally {
  server.kill();
}

const entries = [...lines.entries()].filter(([k, v]) => k && v).slice(0, LIMIT);
const chars = entries.reduce((n, [, v]) => n + v.length, 0);
console.log(`Lines: ${entries.length}, chars: ${chars}, est cost @ neural $${(chars * 0.000016).toFixed(3)} (voice ${VOICE}, engine ${ENGINE})`);
if (DRY) {
  for (const [k, v] of entries) console.log(`  ${k}: ${v.slice(0, 70)}`);
  process.exit(0);
}

fs.mkdirSync(AUDIO, { recursive: true });
const manifest = {};
let ok = 0;
for (const [key, text] of entries) {
  const file = safe(key) + '.mp3';
  const out = path.join(AUDIO, file);
  const r = spawnSync('aws', ['polly', 'synthesize-speech', '--profile', PROFILE, '--region', REGION,
    '--engine', ENGINE, '--voice-id', VOICE, '--output-format', 'mp3', '--text', text, out], { stdio: 'pipe' });
  if (r.status !== 0 || !fs.existsSync(out) || fs.statSync(out).size === 0) {
    console.error(`FAIL ${key}: ${r.stderr.toString().slice(0, 200)}`);
    process.exitCode = 1;
    continue;
  }
  manifest[key] = file;
  ok++;
  process.stdout.write(`\r${ok}/${entries.length} ${file}   `);
}
fs.writeFileSync(path.join(AUDIO, 'manifest.json'), JSON.stringify({ voice: VOICE, engine: ENGINE, files: manifest }, null, 2));
// Prune stale clips (e.g. pre-lineup brief MP3s) so the repo never ships
// audio that names the wrong people.
const keep = new Set(Object.values(manifest).map(String));
for (const f of fs.readdirSync(AUDIO)) {
  if (f.endsWith('.mp3') && !keep.has(f)) { fs.unlinkSync(path.join(AUDIO, f)); console.log('pruned stale ' + f); }
}
console.log(`\nDone: ${ok}/${entries.length} MP3s in public/audio (+manifest.json)`);
