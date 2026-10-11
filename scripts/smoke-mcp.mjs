// Smoke test: spawns the MCP server on a test port and exercises the full
// consent-first flow. Run: npm run test:mcp. Exits non-zero on any failure.
import { spawn } from 'node:child_process';

const PORT = 8099;
const BASE = `http://localhost:${PORT}`;
let failures = 0;

function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra && !cond ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

async function rpc(method, params = {}, session) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  if (session) headers['Mcp-Session-Id'] = session;
  const r = await fetch(`${BASE}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  return { res: r, json: await r.json() };
}
const call = (s, name, args) => rpc('tools/call', { name, arguments: args }, s).then(({ json }) => JSON.parse(json.result.content[0].text));

const server = spawn('node', ['server.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));

try {
  const h = await (await fetch(`${BASE}/health`)).json();
  check('health ok + renamed', h.ok && h.name === 'music-meets-alexa', JSON.stringify(h));

  const init = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  const session = init.res.headers.get('mcp-session-id');
  check('initialize 2025-11-25 + session', init.json.result?.protocolVersion === '2025-11-25' && !!session);

  const list = await rpc('tools/list', {}, session);
  check('6 tools listed', list.json.result?.tools?.length === 6);

  const brief = await call(session, 'get_daily_brief', { intention: 'friend' });
  check('brief: voice + 3 screen cards', !!brief.voice && brief.screen?.cards?.length === 3);

  const teaser = await call(session, 'get_profile_detail', { profileId: 'demo-mika' });
  check('teaser by default (no location on screen)', teaser.view === 'teaser' && !('location' in (teaser.screen || {})));

  const full = await call(session, 'get_profile_detail', { profileId: 'demo-mika', full: true });
  check('full card only with explicit full:true', full.view === 'full' && full.screen?.profile?.location?.includes('Taipei'));

  const noProfile = await call(session, 'save_interest', { profileId: 'demo-mika', intention: 'friend' });
  check('save refused without profile attestation', noProfile.needProfile === true && !noProfile.saved);

  const step1 = await call(session, 'save_interest', { profileId: 'demo-mika', intention: 'friend', profileConfirmed: true });
  check('save step 1 asks confirmation', step1.confirmRequired === true && !step1.saved);

  const step2 = await call(session, 'save_interest', { profileId: 'demo-mika', intention: 'friend', profileConfirmed: true, confirmed: true });
  check('save step 2 stores Pending', step2.saved === true && step2.state === 'pending');

  const mood = await call(session, 'recommend_tracks_for_mood', { mood: 'warm' });
  check('mood tracks', mood.tracks?.length === 2);

  const match = await call(session, 'explain_match', { profileId: 'demo-robin', intention: 'friend' });
  check('ineligible intention handled', match.eligible === false);
} catch (e) {
  check('no exceptions', false, String(e));
} finally {
  server.kill();
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nAll smoke tests passed.');
process.exit(failures ? 1 : 0);
