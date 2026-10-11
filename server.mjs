// Music Meets Alexa — MCP server (Streamable HTTP, MCP spec 2025-11-25).
// Zero dependencies: plain Node http. Run with `npm start` (PORT env, default 8080).
// Endpoints:
//   GET  /health            -> { ok, name, version, spec }
//   POST /mcp               -> JSON-RPC (initialize, tools/list, tools/call, ...)
//   GET  /mcp               -> 405 (documents Streamable HTTP usage)
//   GET  /                  -> serves public/index.html (simulated Alexa+ experience)
//
// Privacy design (the Alexa-in-the-living-room rule):
// - Every tool returns BOTH `voice` (short, speaker-safe, first-name only)
//   AND `screen` (rich detail, rendered on the private screen only).
// - Full profiles need an explicit `full: true` ("show Mika's full profile").
// - save_interest needs an opt-in attestation (`profileConfirmed: true` — the
//   actual profile stays on the user's device, the server never sees a name)
//   plus an explicit second confirmation (`confirmed: true`).
// - In-memory demo store: interests stay Pending forever, nobody is contacted.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profiles, tracks, briefByIntention, briefLineupIndex, explainMatch, mixtapeFor, AS_OF } from './data/profiles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const SERVER = { name: 'music-meets-alexa', version: '0.2.0' };
const SPEC = '2025-11-25';

const interests = [];
const sessions = new Map(); // sessionId -> createdAt

// Session-bound consent ledger (demo-grade, not production identity):
// step 1 (profileConfirmed) must precede step 2 (confirmed) within the same
// session, and the server — not just the client — enforces the order.
const ledgers = new Map(); // sessionId -> { attested: boolean, pending: Map<key, number> }
function ledgerFor(sid) {
  const key = sid || 'stateless';
  if (!ledgers.has(key)) ledgers.set(key, { attested: false, pending: new Map() });
  return ledgers.get(key);
}

const TOOLS = [
  {
    name: 'get_daily_brief',
    description: 'Brew the Daily Listening Brief: 3 fictional adult profiles for a Friend or Lover intention. The lineup rotates daily (see `lineup` in the response). Voice gets first-names-only teaser; screen gets the cards.',
    inputSchema: {
      type: 'object',
      properties: {
        intention: { type: 'string', enum: ['friend', 'lover'], description: 'Connection intention. Friend and Lover stay separate choices.' },
        limit: { type: 'number', description: 'Max profiles (default 3, max 4).' },
        daySeed: { type: 'string', description: 'Demo utility: YYYY-MM-DD to preview a specific daily rotation (for pre-rendering voice lines). Defaults to today.' },
      },
      required: ['intention'],
    },
  },
  {
    name: 'get_profile_detail',
    description: 'One fictional profile. Default returns a speaker-safe teaser; pass full:true only after the user explicitly asks to see the full card on their private screen.',
    inputSchema: {
      type: 'object',
      properties: {
        profileId: { type: 'string', description: 'e.g. demo-mika, demo-jules, demo-noah, demo-robin' },
        full: { type: 'boolean', description: 'Explicit user consent to show the full private-screen card.' },
      },
      required: ['profileId'],
    },
  },
  {
    name: 'explain_match',
    description: 'Why this connection: two grounded reasons + uncertainty + opener on screen; one sentence on voice. Never a compatibility score.',
    inputSchema: {
      type: 'object',
      properties: {
        profileId: { type: 'string' },
        intention: { type: 'string', enum: ['friend', 'lover'] },
      },
      required: ['profileId', 'intention'],
    },
  },
  {
    name: 'propose_mixtape_opener',
    description: 'A 3-track starter mixtape + one-sentence opener for the chosen person. All tracks fictional, synth preview only.',
    inputSchema: {
      type: 'object',
      properties: {
        profileId: { type: 'string' },
        intention: { type: 'string', enum: ['friend', 'lover'] },
      },
      required: ['profileId', 'intention'],
    },
  },
  {
    name: 'recommend_tracks_for_mood',
    description: 'Pick fictional tracks by mood for the room you are in. Moods: mellow, dreamy, warm, groovy.',
    inputSchema: {
      type: 'object',
      properties: { mood: { type: 'string', enum: ['mellow', 'dreamy', 'warm', 'groovy'] } },
      required: ['mood'],
    },
  },
  {
    name: 'save_interest',
    description: 'Two-step consent save, enforced server-side per session. Step 1 (profileConfirmed:true) records a pending confirmation; step 2 (confirmed:true) only succeeds after step 1. Refuses without opt-in attestation and for intentions the person never chose. Demo: nobody is contacted, ever.',
    inputSchema: {
      type: 'object',
      properties: {
        profileId: { type: 'string' },
        intention: { type: 'string', enum: ['friend', 'lover'] },
        profileConfirmed: { type: 'boolean', description: 'Attestation that the user completed the opt-in music profile on their own device. The server never receives personal details.' },
        confirmed: { type: 'boolean', description: 'Explicit second yes after hearing the confirmation summary.' },
      },
      required: ['profileId', 'intention'],
    },
  },
];

function toolResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data };
}
function toolError(msg) {
  return { content: [{ type: 'text', text: msg }], isError: true };
}

function callTool(name, args = {}, ctx = {}) {
  switch (name) {
    case 'get_daily_brief': {
      const intention = args.intention === 'lover' ? 'lover' : 'friend';
      const lineup = briefLineupIndex(intention, args.daySeed);
      const list = briefByIntention(intention, args.daySeed).slice(0, Math.min(Math.max(args.limit || 3, 1), 4));
      return toolResult({
        asOf: AS_OF,
        intention,
        lineup,
        engine: 'scripted-demo',
        note: 'Fictional adults · scripted Music Scout · real choices stay yours. 18+.',
        voice: `Here's your ${intention} listening brief. ${list.map((p) => `${p.displayName}, into ${p.tags[0]}`).join('; ')}. Say "tell me about" plus a name for a teaser.`,
        screen: {
          cards: list.map((p) => ({
            id: p.id, displayName: p.displayName, ageLabel: p.ageLabel, location: p.location,
            headline: p.headline, tags: p.tags,
          anthem: `${p.anthem.title} — ${p.anthem.artist} (${p.anthem.vibe}, ${p.anthem.bpm} bpm)`,
          project: p.project.title,
          icebreaker: p.opener,
          vibe: p.anthem.vibe,
          bpm: p.anthem.bpm,
          cat: 'MMA-' + String(profiles.indexOf(p) + 1).padStart(3, '0'),
          })),
        },
      });
    }
    case 'get_profile_detail': {
      const p = profiles.find((x) => x.id === args.profileId);
      if (!p) return toolError(`Unknown profileId "${args.profileId}". Try demo-mika, demo-jules, demo-noah, demo-robin.`);
      if (!args.full) {
        return toolResult({
          profileId: p.id,
          view: 'teaser',
          voice: `${p.displayName}. ${p.headline} Their anthem is ${p.anthem.title}. Want the full card on your private screen? Say "show ${p.displayName}'s full profile".`,
          screen: {
            displayName: p.displayName, headline: p.headline,
            anthem: `${p.anthem.title} — ${p.anthem.artist}`,
            fullAvailable: true,
          },
        });
      }
      return toolResult({
        profileId: p.id,
        view: 'full',
        voice: `Full card for ${p.displayName} is on your screen. Ritual: ${p.ritual.title}.`,
        screen: { profile: p, notice: 'Private-screen card. Never read aloud in full on a shared speaker.' },
      });
    }
    case 'explain_match': {
      const p = profiles.find((x) => x.id === args.profileId);
      if (!p) return toolError(`Unknown profileId "${args.profileId}".`);
      const intention = args.intention === 'lover' ? 'lover' : 'friend';
      if (!p.intentions.includes(intention))
        return toolResult({ candidateId: p.id, eligible: false, voice: `${p.displayName} isn't open to ${intention} in this demo. Try another intention or person.` });
      const m = explainMatch(p, intention);
      return toolResult({
        candidateId: p.id, eligible: true,
        voice: `Why ${p.displayName}? ${m.reasons[0].split('.')[0]}. Full reasons are on your screen.`,
        screen: m,
      });
    }
    case 'propose_mixtape_opener': {
      const p = profiles.find((x) => x.id === args.profileId);
      if (!p) return toolError(`Unknown profileId "${args.profileId}".`);
      const intention = args.intention === 'lover' ? 'lover' : 'friend';
      const mix = mixtapeFor(p, intention);
      return toolResult({
        ...mix,
        opener: p.opener,
        voice: `A starter mix for ${p.displayName}: ${mix.tracks.map((t) => t.title).join(', ')}. Track list and opener are on your screen.`,
        screen: { tracks: mix.tracks, opener: p.opener },
      });
    }
    case 'recommend_tracks_for_mood': {
      const mood = String(args.mood || '').toLowerCase();
      const list = tracks.filter((t) => t.mood === mood);
      if (!list.length) return toolError('Mood must be one of: mellow, dreamy, warm, groovy.');
      return toolResult({ mood, tracks: list, voice: `For a ${mood} room: ${list.map((t) => `${t.title} by ${t.artist}`).join('; ')}. Tap a track to preview.` });
    }
    case 'save_interest': {
      const p = profiles.find((x) => x.id === args.profileId);
      if (!p) return toolError(`Unknown profileId "${args.profileId}".`);
      const intention = args.intention === 'lover' ? 'lover' : 'friend';
      if (!p.intentions.includes(intention)) {
        return toolResult({
          saved: false, eligible: false, targetId: p.id, intention,
          voice: `${p.displayName} isn't open to ${intention} here — ${p.displayName} chose ${p.intentions.join(' and ')} only. Try another person or intention.`,
        });
      }
      const led = ledgerFor(ctx.sessionId);
      if (args.profileConfirmed) led.attested = true;
      if (!led.attested) {
        return toolResult({
          saved: false, needProfile: true,
          voice: `Before I save anything, I need your opt-in music profile — your name, 18-plus confirmation, and what you're open to. It lives on your device; I never see the details. Say "set up my profile".`,
        });
      }
      const key = `${p.id}:${intention}`;
      if (!args.confirmed) {
        led.pending.set(key, Date.now());
        return toolResult({
          saved: false, confirmRequired: true, targetId: p.id, intention,
          summary: `${intention === 'friend' ? 'Friend' : 'Lover'} interest in ${p.displayName}. Stays Pending until they independently say yes. No contact info is shared.`,
          voice: `Save a ${intention} interest in ${p.displayName}? It stays Pending until they say yes too. Nobody is contacted. Say "yes, save it" to confirm.`,
        });
      }
      if (!led.pending.has(key)) {
        return toolResult({
          saved: false, error: 'CONFIRM_ORDER',
          voice: `Let's do this in order — hear the summary first. Ask me to save a ${intention} interest in ${p.displayName}, then say yes.`,
        });
      }
      led.pending.delete(key);
      const rec = { id: `in-${Date.now()}`, targetId: p.id, intention, state: 'pending', simulated: true, createdAt: new Date().toISOString() };
      interests.push(rec);
      return toolResult({
        saved: true, ...rec,
        voice: `Saved. One yes for ${p.displayName} as ${intention}. Pending until they independently say yes. Nobody was contacted.`,
      });
    }
    default:
      return toolError(`Unknown tool "${name}".`);
  }
}

// ---- JSON-RPC over Streamable HTTP ----
function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

function handleRpc(msg, req) {
  const { id = null, method, params = {} } = msg || {};
  if (msg?.jsonrpc !== '2.0' || typeof method !== 'string') return rpcError(id, -32600, 'Invalid Request: expected JSON-RPC 2.0 with method.');
  switch (method) {
    case 'initialize': {
      const asked = params.protocolVersion;
      const sessionId = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessions.set(sessionId, Date.now());
      req._newSession = sessionId;
      return {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: SPEC,
          requestedVersion: asked || SPEC,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER,
          instructions: 'Voice-first music connection. Voice gets short speaker-safe lines; full detail goes to screen. get_profile_detail needs full:true for the private card; save_interest needs profileConfirmed then confirmed. Start with get_daily_brief. Fictional adults only.',
        },
      };
    }
    case 'notifications/initialized':
      return null; // notification: 202, no body
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
    case 'tools/call': {
      const { name, arguments: args } = params;
      if (!name) return rpcError(id, -32602, 'Missing tool name.');
      return { jsonrpc: '2.0', id, result: callTool(name, args || {}, { sessionId: req.headers['mcp-session-id'] || null }) };
    }
    case 'resources/list':
      return { jsonrpc: '2.0', id, result: { resources: [] } };
    case 'prompts/list':
      return { jsonrpc: '2.0', id, result: { prompts: [] } };
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

function sendJson(res, code, obj, extra = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...extra });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id', 'Access-Control-Expose-Headers': 'Mcp-Session-Id',
    });
    return res.end();
  }
  if (url.pathname === '/health' && req.method === 'GET')
    return sendJson(res, 200, { ok: true, ...SERVER, spec: SPEC, transport: 'streamable-http', tools: TOOLS.map((t) => t.name), interests: interests.length });
  if (url.pathname === '/mcp' && req.method === 'GET')
    return sendJson(res, 405, { error: 'Use POST /mcp with JSON-RPC 2.0 (Streamable HTTP). See POST /mcp and MCP spec 2025-11-25.' });
  if (url.pathname === '/mcp' && req.method === 'DELETE') {
    const sid = req.headers['mcp-session-id'];
    if (sid) sessions.delete(sid);
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
    return res.end();
  }
  if (url.pathname === '/mcp' && req.method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let msg;
      try { msg = JSON.parse(raw || '{}'); }
      catch { return sendJson(res, 400, rpcError(null, -32700, 'Parse error: body must be JSON.')); }
      const handleOne = (m) => handleRpc(m, req);
      if (Array.isArray(msg)) {
        const out = msg.map(handleOne).filter(Boolean);
        const extra = req._newSession ? { 'Mcp-Session-Id': req._newSession } : {};
        return sendJson(res, 200, out, { 'Access-Control-Expose-Headers': 'Mcp-Session-Id', ...extra });
      }
      const out = handleOne(msg);
      const extra = req._newSession ? { 'Mcp-Session-Id': req._newSession } : {};
      if (out === null) {
        res.writeHead(202, { 'Access-Control-Allow-Origin': '*', ...extra });
        return res.end();
      }
      return sendJson(res, 200, out, { 'Access-Control-Expose-Headers': 'Mcp-Session-Id', ...extra });
    });
    return;
  }
  if (req.method === 'GET') {
    const file = url.pathname === '/' ? '/index.html' : url.pathname;
    const fp = path.join(__dirname, 'public', path.normalize(file).replace(/^\.\./, ''));
    if (!fp.startsWith(path.join(__dirname, 'public'))) return sendJson(res, 403, { error: 'forbidden' });
    fs.readFile(fp, (e, data) => {
      if (e) return sendJson(res, 404, { error: 'not found. Try / for the Alexa+ simulator or POST /mcp.' });
      const type = fp.endsWith('.html') ? 'text/html' : fp.endsWith('.js') ? 'text/javascript' : fp.endsWith('.css') ? 'text/css' : fp.endsWith('.png') ? 'image/png' : fp.endsWith('.jpg') || fp.endsWith('.jpeg') ? 'image/jpeg' : fp.endsWith('.svg') ? 'image/svg+xml' : fp.endsWith('.webp') ? 'image/webp' : fp.endsWith('.mp3') ? 'audio/mpeg' : fp.endsWith('.json') ? 'application/json' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    });
    return;
  }
  return sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`[music-meets-alexa] MCP Streamable HTTP on http://localhost:${PORT}/mcp (spec ${SPEC})`);
  console.log(`[music-meets-alexa] Alexa+ simulator on http://localhost:${PORT}/`);
});
