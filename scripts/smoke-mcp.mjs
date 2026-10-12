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
// Poll /health instead of a fixed sleep — survives slow CI boxes (大G couldn't run it locally once).
let ready = false;
for (let i = 0; i < 50; i++) {
  try {
    const r = await fetch(`${BASE}/health`);
    if (r.ok) { ready = true; break; }
  } catch {}
  await new Promise((r) => setTimeout(r, 200));
}
if (!ready) { console.log('FAIL  server never became healthy'); server.kill(); process.exit(1); }

try {
  const h = await (await fetch(`${BASE}/health`)).json();
  check('health ok + renamed', h.ok && h.name === 'music-meets-alexa', JSON.stringify(h));

  const init = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  const session = init.res.headers.get('mcp-session-id');
  check('initialize 2025-11-25 + session', init.json.result?.protocolVersion === '2025-11-25' && !!session);

  const list = await rpc('tools/list', {}, session);
  check('6 tools listed', list.json.result?.tools?.length === 6);

  const brief = await call(session, 'get_daily_brief', { intention: 'friend' });
  check('brief: voice + 3 screen cards + icebreakers + label data + lineup', !!brief.voice && brief.screen?.cards?.length === 3 && Number.isInteger(brief.lineup) && brief.screen.cards.every((c) => !!c.icebreaker && !!c.vibe && !!c.bpm && /^MMA-00\d$/.test(c.cat || '')));

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

  const noahLover = await call(session, 'save_interest', { profileId: 'demo-noah', intention: 'lover', profileConfirmed: true });
  check('save refused for unchosen intention (Noah is friend-only)', noahLover.eligible === false && !noahLover.saved);

  // Fresh session, jump straight to step 2: server must enforce the order.
  const init2 = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'smoke2', version: '0' } });
  const session2 = init2.res.headers.get('mcp-session-id');
  const skip = await call(session2, 'save_interest', { profileId: 'demo-jules', intention: 'friend', profileConfirmed: true, confirmed: true });
  check('step 2 without step 1 refused (CONFIRM_ORDER)', skip.error === 'CONFIRM_ORDER' && !skip.saved);

  const mood = await call(session, 'recommend_tracks_for_mood', { mood: 'warm' });
  check('mood tracks (warm ≥ 2)', (mood.tracks || []).length >= 2);
  const wide = await call(session, 'get_daily_brief', { intention: 'friend', limit: 6 });
  check('brief limit 6 covers roster', wide.screen?.cards?.length === 5);
  const taste = await call(session, 'explain_match', { profileId: 'demo-mika', intention: 'friend', taste: ['making things', 'city pop', 'mellow'] });
  check('shared ground traces to taste', Array.isArray(taste.screen?.shared) && taste.screen.shared.some((s) => /city pop/i.test(s)));
  const cold = await call(session, 'explain_match', { profileId: 'demo-jules', intention: 'friend', taste: ['death metal'] });
  check('no shared tags stays honest', Array.isArray(cold.screen?.shared) && cold.screen.shared.length === 0);
  check('mood tracks (warm ≥ 2)', (mood.tracks || []).length >= 2);

  const theo = await call(session, 'get_profile_detail', { profileId: 'demo-theo', full: true });
  check('six-person cast (Theo full card)', theo.view === 'full' && theo.screen?.profile?.displayName === 'Theo');
  const renLover = await call(session, 'explain_match', { profileId: 'demo-ren', intention: 'lover' });
  check('Ren open to lover', renLover.eligible === true);

  const match = await call(session, 'explain_match', { profileId: 'demo-robin', intention: 'friend' });
  check('ineligible intention handled', match.eligible === false);
} catch (e) {
  check('no exceptions', false, String(e));
} finally {
  server.kill();
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nAll smoke tests passed.');
process.exit(failures ? 1 : 0);
