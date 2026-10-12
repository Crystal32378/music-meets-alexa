#!/usr/bin/env python3
"""Title + closing cards (1920x1080). Amazon Alexa+ hackathon framing.
No Coffee Meets Codex / 3rd-place references (per Crystal feedback)."""
from PIL import Image, ImageDraw, ImageFont
import os, random

W, H = 1920, 1080
PAPER = (245, 245, 245)
INK = (22, 19, 15)
RED = (255, 50, 0)
QUIET = (111, 105, 96)
FD = "/System/Library/Fonts/Supplemental"
F_DISPLAY = f"{FD}/Didot.ttc"
F_SERIF = f"{FD}/Georgia.ttf"
F_SERIF_I = f"{FD}/Georgia Italic.ttf"
F_SANS = f"{FD}/Futura.ttc"

def font(path, size, index=0):
    try: return ImageFont.truetype(path, size, index=index)
    except Exception: return ImageFont.truetype(F_SERIF, size)

def tw(d, s, f):
    b = d.textbbox((0,0), s, font=f); return b[2]-b[0], b[3]-b[1]

def center(d, y, s, f, fill):
    w,h = tw(d,s,f); d.text(((W-w)/2, y), s, font=f, fill=fill); return h

def grain(img, opacity=10):
    random.seed(7); px = img.load()
    for y in range(0,H,3):
        for x in range(0,W,3):
            n = random.randint(-opacity,opacity); r,g,b = px[x,y][:3]
            px[x,y] = (max(0,min(255,r+n)),max(0,min(255,g+n)),max(0,min(255,b+n)))
    return img

def record_badge(d, cx, cy, r):
    """Plain black/red vinyl badge, no text (Crystal: drop the MUSIC wordmark)."""
    d.ellipse([cx-r,cy-r,cx+r,cy+r], fill=INK)
    d.ellipse([cx-r,cy-r,cx+r,cy+r], outline=RED, width=3)
    ir=int(r*0.55); d.ellipse([cx-ir,cy-ir,cx+ir,cy+ir], fill=RED)
    d.ellipse([cx-6,cy-6,cx+6,cy+6], fill=PAPER)

def title_card(path):
    img=Image.new("RGB",(W,H),PAPER); d=ImageDraw.Draw(img)
    d.line([(240,150),(W-240,150)], fill=INK, width=2)
    kick=font(F_SANS,30,index=0); s="A VOICE-FIRST MUSIC CONNECTION DEMO"
    kw,_=tw(d,s,kick); d.text(((W-kw)/2,96),s,font=kick,fill=RED)
    t1=font(F_DISPLAY,150,index=0)
    center(d,250,"Music Meets",t1,INK)
    center(d,400,"Alexa",t1,INK)
    d.rectangle([W/2-120,560,W/2+120,566], fill=RED)
    sub=font(F_SERIF_I,44)
    center(d,610,"meet the person behind the playlist",sub,QUIET)
    record_badge(d, W/2, 800, 110)
    badge=font(F_SANS,28,index=0)
    center(d,940,"Built for the Amazon Alexa+ Hackathon",badge,INK)
    grain(img); img.save(path,"PNG"); print("wrote",path)

def closing_card(path):
    img=Image.new("RGB",(W,H),INK); d=ImageDraw.Draw(img)
    d.line([(240,150),(W-240,150)], fill=RED, width=2)
    kick=font(F_SANS,30,index=0); s="MUSIC MEETS ALEXA"
    kw,_=tw(d,s,kick); d.text(((W-kw)/2,96),s,font=kick,fill=RED)
    big=font(F_DISPLAY,116,index=0)
    center(d,300,"Meet the person",big,PAPER)
    center(d,436,"behind the playlist.",big,PAPER)
    d.rectangle([W/2-120,596,W/2+120,602], fill=RED)
    repo=font(F_SANS,34,index=0)
    center(d,656,"github.com/Crystal32378/music-meets-alexa",repo,PAPER)
    note=font(F_SERIF,30)
    center(d,726,"Amazon Alexa+ Hackathon \u00b7 MIT",note,(180,176,170))
    record_badge(d, W/2, 900, 90)
    grain(img,opacity=8); img.save(path,"PNG"); print("wrote",path)

if __name__ == "__main__":
    out=os.path.join(os.path.dirname(__file__),"cards"); os.makedirs(out,exist_ok=True)
    title_card(os.path.join(out,"title.png"))
    closing_card(os.path.join(out,"closing.png"))
