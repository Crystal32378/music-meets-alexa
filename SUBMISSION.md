# SUBMISSION — Devpost draft + video script + friction log

## 1. Devpost text description (paste-ready)

**Inspiration.** At Taipei Hack Day (Oct 4, 2026) our Coffee Meets Codex — a friendship/romance prototype where shared curiosity starts the conversation — took 3rd place. But the demo lived behind clicks. We kept asking: what if you could just *say* it? For the Alexa+ track we rebuilt it voice-first: *"Alexa, brew my listening brief."* Meet the person behind the playlist.

**What it does.** Music Meets Alexa is a voice-first music-connection demo. Alexa introduces three fictional music lovers matched to your intention (Friend or Lover — always separate), tells you *why* each person fits (two grounded reasons + open uncertainty, never a score), makes a 3-track starter mixtape with an opener line, and saves interests as Pending — because an introduction takes two yeses and nobody is ever contacted here.

**Privacy by design.** A speaker sits in a shared living room, so discovery happens in two layers: a short teaser on the speaker, the full card on your private screen — only when you explicitly ask ("show Mika's full profile"). Your opt-in music profile (name, 18+, intentions, moods) lives only in the browser; the server receives an attestation flag, never your name. Saving an interest takes two explicit yeses.

**How we built it.** Zero-dependency Node MCP server speaking **MCP spec 2025-11-25 over Streamable HTTP** (`POST /mcp`: initialize → tools/list → tools/call, with `Mcp-Session-Id` sessions), 6 tools (`get_daily_brief`, `get_profile_detail`, `explain_match`, `propose_mixtape_opener`, `recommend_tracks_for_mood`, `save_interest`), plus a **simulated Alexa+ web experience** (voice via Web Speech + text + visual cards + WebAudio-synthesized previews, `npm run test:mcp` covers all of it). The cast, consent model, and scout pattern are adapted from our Coffee Meets Codex repo; the MCP layer, simulator, voice/screen split, opt-in profile, and 8-track fictional catalog are new (Oct 11–23). MIT licensed.

**Challenges.** MCP Inspector initially rejected our first handshake (wrong protocolVersion echo) — fixed by negotiating `2025-11-25` explicitly. Devpost pages returned 403 to fetch bots, so we verified rules via search excerpts + community posts. Voice UX needed a text fallback for noisy rooms — every utterance has a clickable chip.

**What's next.** Account linking for real taste profiles, living-room playback on Echo Show via MCP Apps visuals, and a Mandarin voice persona for Taipei cafés.

**Track:** Alexa+. **Tech at runtime:** the simulator's `mcp()` client performs real JSON-RPC `tools/call` against `POST /mcp` (see in-page MCP trace + `curl` in README).

## 2. Demo video script (< 3 min, screen capture + narration, no third-party media)

| Time | Visual | Line |
|---|---|---|
| 0:00–0:15 | Title card: Music Meets Alexa + Coffee Meets Codex 3rd-place badge | "Third place with Coffee Meets Codex. Now — what if you could just say it?" |
| 0:15–0:45 | Terminal: `npm start`, `npm run test:mcp` (11 PASS), MCP Inspector tools/list | "A self-hosted MCP server, spec 2025-11-25, Streamable HTTP. Six music-connection tools, all tested." |
| 0:45–1:20 | Browser sim: click 🎙, say "brew my friend brief" → 3 cards → "tell me about Mika" (teaser) → "show Mika's full profile" (🔒 card) | "Teasers on the speaker, full cards on your private screen — because Alexa lives in the living room." |
| 1:20–1:50 | "Set up my profile" → 4-step chat flow, localStorage note | "Your profile stays on your device. The server gets a yes-flag, never your name." |
| 1:50–2:25 | "Why Jules?" → reasons + uncertainty; tap Mika's badge → city-pop loop + heartbeat line → "That's Mika's kind of music" | "Why each match, with room for discovery. Original generative loops, one per person — tap the label to listen." |
| 2:25–2:45 | "Save interest in Mika" → profile gate → "Yes, save it" → Pending; show MCP trace | "Two yeses. One stays Pending. Every call is real JSON-RPC — watch the trace." |
| 2:45–3:00 | Closing: repo URL + "built Oct 11–23, adapted from our 3rd-place hack" | "Music Meets Alexa — meet the person behind the playlist." |

## 3. Friction log (up to +10% judging bonus — be honest, be specific)

1. **MCP spec version drift (critical).** Older tutorials still show SSE transport; Alexa+ requires Streamable HTTP per spec 2025-11-25. We implemented POST-only JSON-RPC first, then added `Mcp-Session-Id` echo after Inspector warned. *Wish:* one canonical minimal Node example in the Alexa+ docs.
2. **Devpost 403 to bots (important).** `amazonappdev2026.devpost.com/` and `/resources` return 403 to programmatic fetch, slowing research. Verified via web search + community forum instead. *Wish:* an allowlisted API or static mirror for agents.
3. **No local Alexa+ runtime (nice-to-have).** Without a device or official simulator binary, we built our own web simulator — fine for judging, but an official local harness would raise fidelity. *Wish:* `alexa-ai simulate` CLI stub.

## 4. Pre-submission checklist

- [x] Public GitHub repo + MIT license + `npm run test:mcp`
- [x] Live demo URL (Render, verified 2026-10-11): https://music-meets-alexa.onrender.com
- [ ] Oct 24 (after deadline): downgrade Render service back to Free / suspend it — stop the paid meter. Blueprint file stays Starter for now so judges never cold-start.
- [ ] Record < 3 min video, public YouTube/Vimeo, English
- [ ] Devpost: repo URL + video + §1 description + §3 friction log + "built Oct 11–23 on top of Coffee Meets Codex" + track = Alexa+
- [ ] Test on a fresh machine: `npm start` → sim + all 6 tools via Inspector
