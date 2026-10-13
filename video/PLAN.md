# Demo video — DONE ✅ (B route, fully automated)

**Deliverable:** `video/out/music-meets-alexa-demo.mp4`
- Duration **2:51** (under 3:00) · 1280×720 · 25fps · H.264 High + AAC 48kHz stereo
- English, narration = Polly **Matthew** (8 segments, `voiceover/mp3/`)
- Site voice = **Danielle** MP3s (`public/audio/`) + generative loops (`video/audio/*.wav`)
- Burned-in English subtitles (ASS, Georgia serif, warm box) · bookends preserved:
  "What if music could also start a conversation?" → "Meet the person behind the playlist."

## Timeline (as built)
| # | Window | Segment | Visual | Audio in gaps |
|---|---|---|---|---|
| 1 | 0:00–0:17 | hook | Title card + 3rd-place badge (Ken Burns) | Jules ambient bed |
| 2 | 0:17–0:41 | meet | brew friend brief → 3 cards | brief__friend |
| 3 | 0:41–1:08 | hear | Mika teaser → full card → tap label → music+heartbeat | profile + announce + **Mika loop swell** |
| 4 | 1:08–1:30 | why | why Jules → 2 reasons + uncertainty + opener | explain__jules |
| 5 | 1:30–1:55 | privacy | set up my profile → 4-step → localStorage note | setup_* lines |
| 6 | 1:55–2:18 | yeses | save interest → confirm → Pending + confetti | save__step1/step2 |
| 7 | 2:18–2:45 | tech | Terminal: npm start → test:mcp (15 PASS) → tools/list | (terminal) |
| 8 | 2:45–2:51 | closing | Closing card: repo URL + tagline | Mika loop swell |

## Candidate v2 (music-meets-alexa-demo-candidate.mp4) — pending review

Built from `assemble-candidate.py` + `make-panels-candidate.mjs`. Original kept untouched
(`out/music-meets-alexa-demo.mp4`). Two changes only, everything else identical:

| # | Change | Why |
|---|---|---|
| why seg | Jules → **Mika**, and a `propose_mixtape_opener` step so the 3-track list shows on screen when the narration says "three-track mixtape" | Murphy fresh-eye: unexplained Jules/Mika switching; narration promised a tracklist the picture never showed |
| hear panel | "…WebAudio synthesized · **zero copyright risk**" → "**Original music, synthesized live in your browser with WebAudio**" | Unverifiable marketing claim → concrete, checkable (matches `data/profiles.js` `previewTone` WebAudio synth) |

- why slot stays **22s**; new `raw/why-mika.webm` is 23.8s so it is **trimmed** (not slowed),
  landing the mixtape ~6.7s in ≈ 67.7s absolute — aligned to the narration line at 1:07–1:12.
- Total still **2:51**. Danielle mix voice (`mix__demo-mika__friend.mp3`, 9s) intentionally
  NOT added to the audio spine — the 3 songs are a *visual* payoff under the Matthew narration;
  adding it would push past the 83s why window (and is why no timeline extension was needed).
- yeses untouched (already shows the two-yes → Pending flow).

## How it was built (reproducible)
Muse's two pitfalls handled: **(1)** Playwright records silent video, so the generative
music was re-rendered offline via `OfflineAudioContext` (reusing the page's own synth
functions) and all site voice was mixed in post; **(2)** voice input was driven through
the app's native text-input/chip fallback (no mic needed).

Pipeline (scripts kept in `video/`):
1. `record-browser.mjs` *(ran, then removed)* → 5 silent webm @1280×720 in `video/raw/`
2. `record-terminal.mjs` *(ran, then removed)* → `tech.webm` (real captured output, typewriter)
3. `make-cards.py` (Pillow) → `cards/title.png`, `cards/closing.png`
4. `make-subtitles.py` → `work/subtitles.ass` (16 cues, timed to real MP3 durations)
5. `build-audio.py` → `work/soundtrack.wav` (178s: narration spine + Danielle gaps + music beds, loudnorm I=-16)
6. `assemble.py` → trims each clip to slot length, concat, burn subs, mux audio → final MP4

To regenerate after any content change: `python3 video/make-subtitles.py && python3 video/build-audio.py && python3 video/assemble.py`
(and re-record clips if the app UI changed).

## Toolchain installed
- FFmpeg 7.1 static → `video/bin/ffmpeg` (from pip `imageio-ffmpeg`; evermeet.cx was rate-limited)
- Playwright + Chromium (project devDependency)
- Pillow 12.3 · AWS Polly `muse-spark` (Matthew narration + Danielle site voice)

