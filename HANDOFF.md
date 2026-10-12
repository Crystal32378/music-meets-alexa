# Handoff briefing — for the next agent on this repo (hello, Step 5)

## What this is
Music Meets Alexa — voice-first music-connection demo for the **Alexa+ track**
of Build, Ship, Shape: Amazon Developer Hackathon. **Deadline: Oct 23, 2026.**
Repo: https://github.com/Crystal32378/music-meets-alexa · Live: https://music-meets-alexa.onrender.com/
Adapted from Coffee Meets Codex (3rd place, Taipei Hack Day Oct 4 2026).

## Stack (deliberately boring)
Zero-dependency Node ≥ 22. One file server (`server.mjs`, MCP spec 2025-11-25
over Streamable HTTP, `POST /mcp`), one page (`public/index.html`, no build),
data in `data/profiles.js`, MP3s in `public/audio/` (Polly, committed),
portraits in `public/assets/` (AI-illustrated fictional adults).

## Rules of this repo
1. **Verify by running.** `npm test` (MCP smoke + music-engine check) must stay
   green. Never claim "done" from reading alone.
2. **Consent-first is the product.** Two yeses, Pending by default, teaser on
   the speaker / full card on private screen only, opt-in profile stays in
   localStorage. Don't weaken this for convenience.
3. **Everything is fictional.** People, tracks, music (WebAudio-composed),
   previews. Never real names, real songs, or copyrighted audio.
4. **Honest claims only.** Browser speech is not the Alexa voice; Polly is not
   the Alexa voice; consent enforcement is demo-grade (session ledger).
5. Commit as `Crystal32378 <Crystal32378@users.noreply.github.com>`, push to
   `main` (Render auto-deploys). Test commands: `npm start`, `npm test`,
   `npm run gen:voice -- --dry-run`.
6. The human (Crystal, Taipei, Traditional Chinese OK) decides scope. A second
   AI reviewer ("大G", GPT-6.1) audits via GitHub — address its findings.

## Current state (Oct 2026)
v1.1.0+: 6-person cast with daily rotation, 9 pre-rendered brief MP3s keyed by
lineup, generative per-person loops + heartbeat visualizer, genre record-label
badges, Polly voice with speech fallback, notes on play + confetti+rain on save.
Frozen except: demo video + Devpost submission remain.

## Suggested first tasks (good evals)
1. Cold-verify the live deployment: `/health`, initialize handshake, all 6 tools
   against https://music-meets-alexa.onrender.com/ — report, don't change.
2. Mobile pass: 390px wide, tap every flow (brief → full card → mixtape →
   save ×2, profile setup, voice button). List what breaks.
3. Assemble the Devpost paste-pack from SUBMISSION.md (description, friction
   log, AWS Builder + Open Source fields, pre-existing-work statement).

## About you (Step 5 Preview, StepFun)
600B MoE (27B active), 1M context, agentic flagship, Sep 2026. Free on
OpenRouter (incl. OpenCode) this week; open weights ~Oct 15. Use the context:
this whole repo fits — read it all before touching anything.
