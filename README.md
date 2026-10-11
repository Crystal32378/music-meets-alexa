# Music Meets Alexa ☕🎵

*Meet the person behind the playlist.* One song. Two strangers. A conversation begins.

Voice-first music connection — **adapted from [Coffee Meets Codex](https://github.com/andydrewie/coffee-meets-codex)** (3rd place, Taipei Hack Day, Oct 4 2026) for **Build, Ship, Shape: Amazon Developer Hackathon — Alexa+ track** (deadline Oct 23, 2026).

Say *"Alexa, brew my mixtape brief"* and meet three fictional music lovers. Friend and Lover stay separate choices; every introduction takes **two yeses**; nobody is ever contacted. All people and tracks are fictional, and previews are synthesized in-browser — **no copyrighted audio ships**.

## What counts for judging

| Requirement | Where it is |
|---|---|
| Self-hosted MCP server, spec **2025-11-25**, **Streamable HTTP** | `server.mjs` → `POST /mcp` (initialize / tools/list / tools/call, `Mcp-Session-Id`) |
| Simulated Alexa+ experience in a web app | `public/index.html` — voice (Web Speech) + text + visual cards, calls the MCP server with real JSON-RPC |
| Track tech actually called at runtime, not just README | The page's `mcp()` client calls `tools/call` for all 6 tools; `curl` examples below |
| Code repo + demo video (< 3 min) | This repo + `SUBMISSION.md` script |

## Run it (zero dependencies, Node ≥ 22)

```sh
npm start
# MCP:  http://localhost:8080/mcp
# Sim:  http://localhost:8080/
```

```sh
# health
curl -s http://localhost:8080/health
# initialize (spec 2025-11-25 handshake)
curl -s -X POST http://localhost:8080/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"demo","version":"0"}}}'
# list tools
curl -s -X POST http://localhost:8080/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
# brew a brief
curl -s -X POST http://localhost:8080/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_daily_brief","arguments":{"intention":"friend"}}}'
```

Also works in MCP Inspector pointed at `http://localhost:8080/mcp` (Streamable HTTP).
Full flow check: `npm run test:mcp` (spawns a test server, exercises teaser/full/save gates).

## The 6 tools (voice/private split)

Every tool returns **`voice`** (short, speaker-safe — the only thing Alexa says aloud)
plus **`screen`** (rich detail for the private screen, never read out in full):

1. `get_daily_brief {intention}` — Daily Listening Brief: 3 fictional profiles for Friend or Lover.
2. `get_profile_detail {profileId, full?}` — teaser by default; full card only with explicit `full: true` ("show Mika's full profile").
3. `explain_match {profileId, intention}` — two grounded reasons + uncertainty + opener on screen, one line on voice. Never a score.
4. `propose_mixtape_opener {profileId, intention}` — 3-track starter mix + opener.
5. `recommend_tracks_for_mood {mood}` — mellow / dreamy / warm / groovy.
6. `save_interest {profileId, intention, profileConfirmed?, confirmed?}` — refuses without an opt-in attestation, then asks for a second yes → stays **Pending**. Demo: nobody contacted.

## Privacy: the living-room rule

A speaker sits in a shared room, so discovery happens in two layers:
_teaser on the speaker, full card on the private screen, and only when asked._
Your opt-in music profile (name, 18+, intentions, moods) lives **only in the browser's localStorage** — the server receives an attestation flag, never your name.

## What we reused vs. built (Oct 11–23 window)

- **Reused from Coffee Meets Codex:** Friend/Lover intention model, consent-first two-yes flow, fictional demo cast (Mika / Jules / Noah / Robin), "reasons + uncertainty + opener" scout pattern, scripted-demo labeling.
- **Built for this hackathon:** music-identity reskin (anthems, rituals, sonic tags), MCP Streamable HTTP server from scratch, Alexa+ web simulator with voice I/O + synth previews, original 8-track fictional catalog.

## Safety & content notes

- Fictional adults only, 18+. No real profiles, matches, or messages.
- No contact details exist anywhere in the data model.
- No third-party music, images, or footage. Demo video will use screen capture + narration only.
