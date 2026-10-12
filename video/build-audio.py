#!/usr/bin/env python3
"""Build the 178s soundtrack with a SCHEDULER that guarantees no voice-over-voice
overlap. Narration (Matthew) is the fixed spine; Danielle site-voice cues are
packed WITHIN each scene window (after that scene's narration) so audio always
matches the picture. Music beds play under voice. A checker asserts zero voice
overlaps (music exempt) and prints a numeric timeline for the 'ear' to verify."""
import os, subprocess, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO = os.path.join(ROOT, "video")
FF = os.path.join(VIDEO, "bin", "ffmpeg")
PUB_AUDIO = os.path.join(ROOT, "public", "audio")
VO = os.path.join(ROOT, "voiceover", "mp3")
WORK = os.path.join(VIDEO, "work")
os.makedirs(WORK, exist_ok=True)
TOTAL = 171.0
SR = 48000

def pa(name): return os.path.join(PUB_AUDIO, name)

def dur(mp3):
    out = subprocess.run([FF, "-i", mp3], capture_output=True, text=True).stderr
    m = re.search(r"Duration: 00:00:(\d+)\.(\d+)", out)
    return int(m.group(1)) + int(m.group(2)) / 100.0

NARR = [
    ("hook",    1.2,  os.path.join(VO, "hook.mp3")),
    ("meet",    10.6, os.path.join(VO, "meet.mp3")),
    ("hear",    34.6, os.path.join(VO, "hear.mp3")),
    ("why",     61.6, os.path.join(VO, "why.mp3")),
    ("privacy", 83.6, os.path.join(VO, "privacy.mp3")),
    ("yeses",   108.6,os.path.join(VO, "yeses.mp3")),
    ("tech",    131.6,os.path.join(VO, "tech.mp3")),
    ("closing", 158.6,os.path.join(VO, "closing.mp3")),
]

WINDOWS = [
    ("meet", 10.0, 34.0), ("hear", 34.0, 61.0), ("why", 61.0, 83.0),
    ("privacy", 83.0, 108.0), ("yeses", 108.0, 131.0),
]

SITE = [
    ("brief_friend", pa("brief__friend__1.mp3"), 1.0, "meet", 0.3),
    ("profile_mika", pa("profile__demo-mika.mp3"), 1.0, "hear", 0.3),
    ("announce_mika", pa("announce__demo-mika.mp3"), 1.0, "hear", 10.0),
    ("explain_jules", pa("explain__demo-jules__friend.mp3"), 1.0, "why", 0.3),
    ("setup_name", pa("setup_name.mp3"), 0.95, "privacy", 0.3),
    ("setup_adult", pa("setup_adult.mp3"), 0.9, "privacy", 3.0),
    ("setup_intent", pa("setup_intention.mp3"), 0.9, "privacy", 5.0),
    ("setup_moods", pa("setup_moods.mp3"), 0.9, "privacy", 7.5),
    ("setup_consent", pa("setup_consent.mp3"), 0.95, "privacy", 11.5),
    ("save_step1", pa("save__demo-mika__friend__step1.mp3"), 1.0, "yeses", 0.3),
    ("save_step2", pa("save__demo-mika__friend__step2.mp3"), 1.0, "yeses", 10.0),
]

MUSIC = [
    (0.0, "demo-jules.wav", 0.30, 10.0), (10.0, "demo-jules.wav", 0.18, 24.0),
    (34.0, "demo-mika.wav", 0.50, 27.0), (61.0, "demo-jules.wav", 0.20, 22.0),
    (83.0, "demo-noah.wav", 0.18, 25.0), (108.0, "demo-robin.wav", 0.22, 23.0),
    (131.0, "demo-jules.wav", 0.16, 27.0), (158.0, "demo-mika.wav", 0.40, 13.0),
]

def build_voice_timeline():
    narr = []
    for name, start, f in NARR:
        d = dur(f); narr.append({"name": name, "start": start, "end": start + d, "file": f})
    narr.sort(key=lambda x: x["start"])
    narr_by_scene = {n["name"]: n for n in narr}
    win = {s: (a, b) for s, a, b in WINDOWS}
    def push_past(start, dur_):
        pad = 0.12; changed = True
        while changed:
            changed = False
            for n in narr:
                if start < n["end"] + pad and start + dur_ > n["start"] - pad:
                    start = n["end"] + pad; changed = True
        return start, start + dur_
    site = []
    by_scene = {}
    for name, f, gain, scene, off in SITE:
        by_scene.setdefault(scene, []).append((off, name, f, gain))
    for scene, items in by_scene.items():
        wstart, wend = win[scene]
        n = narr_by_scene.get(scene)
        floor = (n["end"] + 0.15) if n else wstart
        cursor = max(wstart, floor)
        for off, name, f, gain in sorted(items):
            d = dur(f)
            start = max(cursor + 0.15, wstart + off)
            start, end = push_past(start, d)
            skip = end > wend + 0.5
            site.append({"name": name, "start": start, "end": end, "file": f, "gain": gain, "skip": skip})
            cursor = end
    site.sort(key=lambda x: x["start"])
    return narr, site

def check_overlaps(narr, site, tol=0.05):
    active = [s for s in site if not s.get("skip")]
    cues = [(n["start"], n["end"], "NARR:" + n["name"]) for n in narr] + \
           [(s["start"], s["end"], "SITE:" + s["name"]) for s in active]
    cues.sort(); problems = []
    for i in range(len(cues) - 1):
        a, b = cues[i], cues[i + 1]
        if b[0] < a[1] - tol: problems.append((a, b))
    return cues, problems

def mmss(t): return f"{int(t//60)}:{int(t%60):02d}"

def main():
    narr, site = build_voice_timeline()
    skipped = [s for s in site if s.get("skip")]
    active = [s for s in site if not s.get("skip")]
    cues, problems = check_overlaps(narr, site)
    print("=== VOICE TIMELINE (narration + site) ===")
    for a, b, name in cues: print(f"  {mmss(a)}-{mmss(b)}  {name}")
    if skipped: print("  (skipped, no room): " + ", ".join(s["name"] for s in skipped))
    if problems:
        print("\n!! OVERLAPS:")
        for a, b in problems: print(f"   {a[2]} [{mmss(a[0])}-{mmss(a[1])}] x {b[2]} [{mmss(b[0])}-{mmss(b[1])}]")
        raise SystemExit("voice overlap - aborting")
    print("OK: zero voice-over-voice overlaps.\n")
    inputs = []; fc = []; labels = []
    for i, n in enumerate(narr):
        inputs += ["-i", n["file"]]; ms = int(n["start"] * 1000)
        fc.append(f"[{i}:a]aresample={SR},aformat=sample_fmts=fltp:channel_layouts=stereo,adelay={ms}|{ms},volume=1.0[v{i}]")
        labels.append(f"[v{i}]")
    n0 = len(narr)
    for j, s in enumerate(active):
        inputs += ["-i", s["file"]]; idx = n0 + j; ms = int(s["start"] * 1000)
        fc.append(f"[{idx}:a]aresample={SR},aformat=sample_fmts=fltp:channel_layouts=stereo,adelay={ms}|{ms},volume={s['gain']}[w{j}]")
        labels.append(f"[w{j}]")
    m0 = n0 + len(active)
    for k, (start, f, gain, d) in enumerate(MUSIC):
        inputs += ["-i", os.path.join(VIDEO, "audio", f)]; idx = m0 + k; ms = int(start * 1000)
        fc.append(f"[{idx}:a]aresample={SR},aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=0:{d},asetpts=N/SR/TB,adelay={ms}|{ms},volume={gain}[b{k}]")
        labels.append(f"[b{k}]")
    fc.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:dropout_transition=0[premix]")
    fc.append(f"[premix]apad,atrim=0:{TOTAL},asetpts=N/SR/TB,loudnorm=I=-16:TP=-1.5:LRA=11[out]")
    out = os.path.join(WORK, "soundtrack.wav")
    cmd = [FF, "-y"] + inputs + ["-filter_complex", ";".join(fc), "-map", "[out]", "-ar", str(SR), "-ac", "2", "-t", str(TOTAL), out]
    print("mixing %d inputs..." % (len(inputs) // 2))
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print(r.stderr[-3000:]); raise SystemExit("audio mix failed")
    info = subprocess.run([FF, "-i", out], capture_output=True, text=True).stderr
    d = re.search(r"Duration: (\S+),", info)
    print("wrote", out, "| duration:", d.group(1) if d else "?")

if __name__ == "__main__": main()
