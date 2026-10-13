#!/usr/bin/env python3
"""CANDIDATE assembly — same 60/40 pipeline as assemble.py, two changes only:
   (1) why scene uses why-mika.webm (Mika + mixtape tracklist, replaces Jules);
   (2) panels come from panels-candidate/ (hear subline reworded, no
       'zero copyright risk'). Everything else (bookends, slots, audio, subs)
       is untouched, so the candidate stays 2:51 and directly comparable.

Slot lengths still sum to 171s (2:51). why-mika.webm is 23.8s (> 22s slot),
so build_split TRIMS it to 22s (no slow-down) — the mixtape lands ~6.7s in,
lining up with the narration's 'three-track mixtape' line (~67s absolute)."""
import os, subprocess, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO = os.path.join(ROOT, "video")
FF = os.path.join(VIDEO, "bin", "ffmpeg")
RAW = os.path.join(VIDEO, "raw")
CARDS = os.path.join(VIDEO, "cards")
PANELS = os.path.join(VIDEO, "panels-candidate")   # <-- candidate panels
WORK = os.path.join(VIDEO, "work")
OUT = os.path.join(VIDEO, "out")
for d in (WORK, OUT): os.makedirs(d, exist_ok=True)

FPS = 25; LW, LH = 768, 720; RW, RH = 512, 720; W, H = 1280, 720

# (seg, kind, left_ref, panel_ref, slot). why uses why-mika.webm.
SEGMENTS = [
    ("seg0_title",   "full",  "title.png",   None,             10.0),
    ("seg1_meet",    "split", "meet.webm",   "meet.png",       24.0),
    ("seg2_hear",    "split", "hear.webm",   "hear.png",       27.0),
    ("seg3_why",     "split", "why-mika.webm","why.png",       22.0),
    ("seg4_privacy", "split", "privacy.webm","privacy.png",    25.0),
    ("seg5_yeses",   "split", "yeses.webm",  "yeses.png",      23.0),
    ("seg6_tech",    "split", "tech.webm",   "tech.png",       27.0),
    ("seg7_closing", "full",  "closing.png", None,             13.0),
]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("FAIL:", " ".join(cmd[:8])); print(r.stderr[-2500:]); raise SystemExit(1)
    return r

def probe_dur(p):
    info = subprocess.run([FF, "-i", p], capture_output=True, text=True).stderr
    m = re.search(r"Duration: 00:00:(\d+)\.(\d+)", info)
    return int(m.group(1)) + int(m.group(2)) / 100.0 if m else 0

def build_full(name, card, slot):
    """Full-width card with gentle Ken Burns zoom."""
    out = os.path.join(WORK, name + ".mp4")
    src = os.path.join(CARDS, card)
    vf = (f"scale=2560:1440,zoompan=z='min(zoom+0.0006,1.06)':x='iw/2-(iw/zoom/2)':"
          f"y='ih/2-(ih/zoom/2)':d={int(slot*FPS)}:s={W}x{H}:fps={FPS},format=yuv420p")
    run([FF, "-y", "-loop", "1", "-t", str(slot), "-i", src, "-vf", vf, "-r", str(FPS),
         "-t", str(slot), "-c:v", "libx264", "-preset", "medium", "-crf", "18",
         "-pix_fmt", "yuv420p", "-an", out])
    return out

def build_split(name, clip, panel, slot):
    """Left = app clip trimmed/slowed to slot; Right = panel still. hstack -> 1280x720."""
    out = os.path.join(WORK, name + ".mp4")
    clip_path = os.path.join(RAW, clip)
    panel_path = os.path.join(PANELS, panel)
    sd = probe_dur(clip_path)
    if sd < slot - 0.3:
        factor = sd / slot
        left_vf = f"setpts=PTS/{factor},fps={FPS},scale={LW}:{LH},setsar=1,format=yuv420p"
    else:
        left_vf = f"fps={FPS},scale={LW}:{LH},setsar=1,format=yuv420p"
    # panel: subtle zoom so it isn't dead-still
    right_vf = (f"scale=1024:1440,zoompan=z='min(zoom+0.0004,1.03)':x='iw/2-(iw/zoom/2)':"
                f"y='ih/2-(ih/zoom/2)':d={int(slot*FPS)}:s={RW}x{RH}:fps={FPS},format=yuv420p")
    fc = (f"[0:v]{left_vf}[L];[1:v]{right_vf}[R];[L][R]hstack=inputs=2[V]")
    run([FF, "-y", "-i", clip_path, "-loop", "1", "-t", str(slot), "-i", panel_path,
         "-filter_complex", fc, "-map", "[V]", "-r", str(FPS), "-t", str(slot),
         "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-an", out])
    return out

def concat(paths, list_file):
    with open(list_file, "w") as f:
        for p in paths: f.write(f"file '{p}'\n")
    joined = os.path.join(WORK, "joined.mp4")
    run([FF, "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", joined])
    return joined

def finalize(joined):
    subs = os.path.join(WORK, "subtitles.ass")
    sound = os.path.join(WORK, "soundtrack.wav")
    out = os.path.join(OUT, "music-meets-alexa-demo-candidate.mp4")
    subs_esc = subs.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    vf = f"subtitles='{subs_esc}'"
    run([FF, "-y", "-i", joined, "-i", sound, "-vf", vf,
         "-map", "0:v", "-map", "1:a",
         "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
         "-movflags", "+faststart", "-shortest", out])
    return out

def main():
    paths = []
    for name, kind, left, panel, slot in SEGMENTS:
        print(f"building {name} ({slot}s, {kind})...")
        if kind == "full": paths.append(build_full(name, left, slot))
        else: paths.append(build_split(name, left, panel, slot))
    print("concatenating..."); joined = concat(paths, os.path.join(WORK, "concat.txt"))
    print("burning subtitles + muxing..."); out = finalize(joined)
    info = subprocess.run([FF, "-i", out], capture_output=True, text=True).stderr
    dur = re.search(r"Duration: (\S+),", info); res = re.findall(r"(\d{3,4}x\d{3,4})", info)
    print("\n=== FINAL ==="); print("file:", out)
    print("duration:", dur.group(1) if dur else "?"); print("resolution:", res[0] if res else "?")
    print("size:", round(os.path.getsize(out) / 1e6, 1), "MB")

if __name__ == "__main__": main()
