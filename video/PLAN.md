# Demo video — DONE ✅ (B route, fully automated)

**Deliverable:** `video/out/music-meets-alexa-demo.mp4`
- Duration **2:58** (under 3:00) · 1280×720 · 25fps · H.264 High + AAC 48kHz stereo · 10.6 MB
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
| 8 | 2:45–2:58 | closing | Closing card: repo URL + tagline | Mika loop swell |

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

