#!/usr/bin/env python3
"""ASS captions for the 60/40 layout, v3 (Crystal): line breaks respect
sentence/clause boundaries. We split narration into CLAUSES at punctuation
(.;,—), then pack whole clauses into cues of <= MAX_LINES lines, each line
<= MAX_WORDS_PER_LINE words. A clause is never split mid-way, and a page break
only happens after a clause completes -- so captions read the way people speak.

No captions on title/closing cards. Right-panel centered, 22px."""
import re, subprocess, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VO = os.path.join(ROOT, "voiceover")
FFMPEG = os.path.join(ROOT, "video", "bin", "ffmpeg")

ORDER = ["meet", "hear", "why", "privacy", "yeses", "tech"]
STARTS = {"meet": 10.6, "hear": 34.6, "why": 61.6, "privacy": 83.6, "yeses": 108.6, "tech": 131.6}
MAX_WORDS_PER_LINE = 8
MAX_LINES = 3

def dur(mp3):
    out = subprocess.run([FFMPEG, "-i", mp3], capture_output=True, text=True).stderr
    m = re.search(r"Duration: 00:00:(\d+)\.(\d+)", out)
    return int(m.group(1)) + int(m.group(2)) / 100.0

def parse_script():
    md = open(os.path.join(VO, "script.md")).read()
    parts = re.split(r"^## (\S+).*$", md, flags=re.M)[1:]
    segs = {}
    for i in range(0, len(parts) - 1, 2):
        key = re.sub(r"^seg\d+-", "", parts[i])
        text = re.sub(r"\s+", " ", parts[i + 1]).strip()
        if len(text) > 10: segs[key] = text
    return segs

def ts(t):
    h = int(t // 3600); m = int((t % 3600) // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"

def split_clauses(text):
    """Split into clauses only at STRONG boundaries (sentence end . ; or em-dash
    —). Commas stay inside a clause (they are brief pauses, not page breaks), so
    lines wrap by word count but never break mid-sentence. Keeps the delimiter
    attached to the clause it ends."""
    pieces = re.split(r'(?<=[.;])\s+|(?<=—)\s+', text)
    return [p.strip() for p in pieces if p.strip()]

def wrap_clause(clause):
    """Wrap one clause into lines of <= MAX_WORDS_PER_LINE words. Never merges
    two clauses on a line (keeps meaning intact). Returns list of lines."""
    words = clause.split()
    lines = []
    for i in range(0, len(words), MAX_WORDS_PER_LINE):
        lines.append(" ".join(words[i:i + MAX_WORDS_PER_LINE]))
    return lines

def build_cues(text):
    """Pack whole clauses into cues; a cue holds as many clauses as fit within
    MAX_LINES lines. Page breaks fall on clause boundaries only.
    Returns list of (word_count, [lines])."""
    clauses = split_clauses(text)
    cues = []
    cur_lines = []
    cur_wc = 0
    for cl in clauses:
        cl_lines = wrap_clause(cl)
        cl_wc = len(cl.split())
        if cur_lines and len(cur_lines) + len(cl_lines) > MAX_LINES:
            cues.append((cur_wc, cur_lines)); cur_lines = []; cur_wc = 0
        cur_lines.extend(cl_lines); cur_wc += cl_wc
    if cur_lines: cues.append((cur_wc, cur_lines))
    return cues

def main():
    segs = parse_script(); events = []
    for key in ORDER:
        if key not in segs: continue
        d = dur(os.path.join(VO, "mp3", key + ".mp3")); start = STARTS[key]
        cues = build_cues(segs[key])
        tot_wc = sum(c[0] for c in cues) or 1
        t = start
        for wc, lines in cues:
            cd = d * (wc / tot_wc)
            events.append((t, t + cd, lines)); t += cd
    header = """[Script Info]
Title: Music Meets Alexa - demo captions
ScriptType: v4.00+
WrapStyle: 2
PlayResX: 1280
PlayResY: 720
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Georgia,22,&H00F5F5F5,&H00FFFFFF,&H0016130F,&H64000000,0,0,0,0,100,100,0.4,0,3,2,0,2,768,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    out = os.path.join(ROOT, "video", "work", "subtitles.ass")
    with open(out, "w") as f:
        f.write(header)
        for a, b, lines in events:
            f.write(f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{'\\N'.join(lines)}\n")
    print("wrote", out, f"({len(events)} cues, clause-aligned, <=3 lines)")
    for a, b, lines in events: print(f"  {ts(a)}  {' / '.join(lines)}")

if __name__ == "__main__": main()
