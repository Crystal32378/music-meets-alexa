# Demo video — fresh-eye review log (Murphy / OpenAI Astra) + Step-5 assessment

Reviewer: **Murphy** (OpenAI Astra), fresh-eye pass on the story, the preview site,
and hackathon fit. Assessed & executed by **Step 5 (StepFun)** on 2026-10-13.
Scope decided by Crystal: **keep the original, build a candidate** — re-record only the
`why` scene (unify Mika + show the mixtape tracklist), reword the copyright line, fix the
stale duration, do local zoom only where genuinely unreadable. yeses untouched.

## Verdict

Murphy's six points were all **factually grounded** (no phantom issues) and well ordered
(fix consistency → fix sound/picture mismatch → polish wording). All accepted.

## Murphy's points → assessment → action

| # | Murphy's finding | Verified? | Action taken |
|---|---|---|---|
| 1 | Keep visual style, opening & ending | ✅ | Untouched. Bookends preserved. |
| 2 | Unexplained Jules/Mika switching | ✅ (hear=Mika → why=Jules → yeses=Mika) | Re-recorded `why` with **Mika**; `raw/why-mika.webm`. |
| 3 | Narration says "three-track mixtape" but no tracklist is shown | ✅ (`why.webm` only ran `explain_match`) | Added a `propose_mixtape_opener` step; 3-track list now on screen exactly when the line is spoken. |
| 4 | "zero copyright risk" is unverifiable | ✅ (`make-panels.mjs` hear subline) | → "Original music, synthesized live in your browser with WebAudio" (matches `data/profiles.js` `previewTone` WebAudio synth). |
| 5 | Replace, don't lengthen; only 9s of headroom | ✅ (real duration **2:51**, not 2:58 as PLAN said) | All changes inside the existing 22s why slot. **No timeline extension needed.** |
| 6 | Zoom small text only where unreadable | ✅ | Panels legible at 512px; the app footage reads fine. **No zoom applied** — nothing was genuinely unreadable. |

## Bonus fixes (found during verification)

- `video/PLAN.md` said **2:58**; the real file is **2:51** (ffprobe). Corrected, plus the
  stale "sum to 178s" comment in `assemble.py`.

## Key technical notes

- `raw/why-mika.webm` is **23.8s** (> the 22s slot) → `build_split` **trims** it (no slow-down),
  so the mixtape lands ~6.7s in ≈ 67.7s absolute, aligned to the narration line at 1:07–1:12.
- Danielle's `mix__demo-mika__friend.mp3` (9s) was **intentionally not** added to the audio
  spine: the 3 songs are a *visual* payoff under the Matthew narration. Adding it after the
  10.8s why narration would push past the 83s why window and force a timeline extension.
- yeses already showed the two-yes → Pending flow, so it was not re-recorded (per scope).

## Files (candidate only — original untouched)

- `video/out/music-meets-alexa-demo-candidate.mp4` — candidate (**2:51.00**, 1280×720, 11.7 MB)
- `video/out/music-meets-alexa-demo.mp4` — original, unchanged (**2:51.00**)
- `video/assemble-candidate.py`, `video/make-panels-candidate.mjs` — candidate pipeline
- `video/panels-candidate/`, `video/raw/why-mika.webm` — candidate assets
- `npm test` stays green.

**Decision pending:** Crystal to watch both cuts and choose original vs candidate.
