# -*- coding: utf-8 -*-
"""
Generuje brandowaną grafikę Open Graph (1200x630) dla portfolio.
Bohaterem jest kadr hero (złota godzina), na nim cinematic scrim + typografia marki
(Cormorant Garamond + Jost) i akcent szampana — spójnie z resztą strony.

Uruchom z katalogu projektu:  python scripts/make_og.py
Wynik: images/home/og-image.jpg
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT   = Path(__file__).resolve().parent.parent
SRC    = ROOT / "images" / "optimized" / "w-01-full.jpg"   # złota godzina, para w polu
OUTDIR = ROOT / "images" / "home"
OUT    = OUTDIR / "og-image.jpg"
FONTS  = ROOT / "assets" / "fonts"

W, H = 1200, 630

# --- paleta (z design systemu) ---
INK       = (11, 11, 12)
BONE      = (244, 241, 236)
BONE2     = (198, 192, 181)
BONE3     = (140, 135, 126)
WHITE     = (255, 255, 255)
CHAMPAGNE = (194, 166, 107)

def font(name, size, wght=None, italic=False):
    f = ImageFont.truetype(str(FONTS / name), size)
    if wght is not None:
        try: f.set_variation_by_axes([wght])
        except Exception: pass
    return f

# ---------------------------------------------------------------- tło: cover-crop
img = Image.open(SRC).convert("RGB")
sw, sh = img.size
scale = max(W / sw, H / sh)
nw, nh = round(sw * scale), round(sh * scale)
img = img.resize((nw, nh), Image.LANCZOS)
# bias ku górze (jak object-position: center 38% w hero)
left = (nw - W) // 2
top  = round((nh - H) * 0.30)
img  = img.crop((left, top, left + W, top + H))

# ---------------------------------------------------------------- scrim cinematic
# 1) lekkie globalne przyciemnienie, by kość-biel tekstu „siadła"
overlay = Image.new("RGB", (W, H), INK)
img = Image.blend(img, overlay, 0.22)

# 2) pionowy gradient: ciemniej u góry (nav) i mocno u dołu (tekst)
grad = Image.new("L", (1, H), 0)
for y in range(H):
    t = y / (H - 1)
    top_a = 172 * (1 - min(t / 0.42, 1)) ** 0.9    # góra (mocniej, by marka czytała)
    bot_a = 235 * max((t - 0.42) / 0.58, 0) ** 1.25  # dół
    grad.putpixel((0, y), int(min(top_a + bot_a, 255)))
grad = grad.resize((W, H))
img = Image.composite(Image.new("RGB", (W, H), INK), img, grad)

# 3) delikatna winieta
vig = Image.new("L", (W, H), 0)
vd = ImageDraw.Draw(vig)
vd.ellipse((-W * 0.30, -H * 0.42, W * 1.30, H * 1.55), fill=255)
vig = vig.point(lambda a: 255 - a)             # ciemniej przy krawędziach
img = Image.composite(Image.new("RGB", (W, H), INK), img, vig.point(lambda a: int(a * 0.45)))

draw = ImageDraw.Draw(img)
CX = W // 2

# ---------------------------------------------------------------- helper: tracking
def tracked(cx, y, text, fnt, fill, tracking):
    widths = [draw.textlength(ch, font=fnt) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = cx - total / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=fnt, fill=fill, anchor="lm")
        x += w + tracking
    return total

# ---------------------------------------------------------------- monogram + marka
draw.text((CX, 92), "M", font=font("Cormorant.ttf", 86, 600), fill=BONE, anchor="mm")
tracked(CX, 150, "MARIUSZ ŚWIERGULA", font("Jost.ttf", 19, 400), BONE2, 7)

# ---------------------------------------------------------------- hasło (bohater)
draw.text((CX, 312), "Historie zapisane",
          font=font("Cormorant.ttf", 78, 500), fill=BONE, anchor="mm")
draw.text((CX, 392), "światłem i emocjami",
          font=font("Cormorant-Italic.ttf", 78, 500), fill=WHITE, anchor="mm")

# ---------------------------------------------------------------- akcent + kicker
rule_w = 58
draw.line((CX - rule_w // 2, 486, CX + rule_w // 2, 486), fill=CHAMPAGNE, width=2)
tracked(CX, 524, "FOTOGRAFIA ŚLUBNA I RODZINNA", font("Jost.ttf", 16, 500), CHAMPAGNE, 6)

# ---------------------------------------------------------------- zapis
OUTDIR.mkdir(parents=True, exist_ok=True)
img.save(OUT, "JPEG", quality=88, optimize=True, progressive=True)
print("OG zapisany:", OUT, img.size, f"{OUT.stat().st_size/1024:.0f} KB")
