// Probe: dump every tool response the demo touches, so we can build accurate
// subtitles, confirm which Polly MP3 each scene plays, and know audio lengths.
// Usage: node video/probe.mjs   (expects server on :8080)
const BASE = 'http://localhost:8080';
const hdr = (s) => ({ 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(s ? { 'Mcp-Session-Id': s } : {}) });
async function rpc(method, params, s) {
  const r = await fetch(`${BASE}/mcp`, { method: 'POST', headers: hdr(s), body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  return { res: r, json: await r.json(), sid: r.headers.get('mcp-session-id') };
}
const call = (s, name, args) => rpc('tools/call', { name, arguments: args }, s).then(({ json }) => JSON.parse(json.result.content[0].text));
const init = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'probe', version: '0' } });
const S = init.sid;
const out = {};
out.brief_friend = await call(S, 'get_daily_brief', { intention: 'friend' });
out.teaser_mika = await call(S, 'get_profile_detail', { profileId: 'demo-mika' });
out.full_mika = await call(S, 'get_profile_detail', { profileId: 'demo-mika', full: true });
out.why_jules = await call(S, 'explain_match', { profileId: 'demo-jules', intention: 'friend' });
out.opener_mika = await call(S, 'propose_mixtape_opener', { profileId: 'demo-mika', intention: 'friend' });
out.mood_mellow = await call(S, 'recommend_tracks_for_mood', { mood: 'mellow' });
// save flow needs a profile on the client; server-side it just needs the two-step
out.save_needprofile = await (async () => { const i2 = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'p2', version: '0' } }); return call(i2.sid, 'save_interest', { profileId: 'demo-mika', intention: 'friend' }); })();
out.save_step1 = await call(S, 'save_interest', { profileId: 'demo-mika', intention: 'friend', profileConfirmed: true });
out.save_step2 = await call(S, 'save_interest', { profileId: 'demo-mika', intention: 'friend', profileConfirmed: true, confirmed: true });
console.log(JSON.stringify(out, null, 2));
