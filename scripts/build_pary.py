#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Galerie par (strefa prywatna) — krok 1/2: przygotowanie zdjęć + metadanych.

Skanuje katalogi w SRC (E:\\weddings_SELEKCJA), a dla każdej pary:
  1. wyciąga NAZWĘ z nazwy folderu (rok + słowo "SLUB" precz, ładny zapis),
  2. deterministycznie (seed = slug) losuje N zdjęć do galerii + 1 teaser,
  3. teaser -> PUBLICZNE zoptymalizowane warianty (avif/webp/jpg) w images/pary/<slug>/,
  4. zdjęcia galerii -> pojedynczy JPEG (~długi bok LONG_EDGE) do STAGE (poza repo!),
     które w kroku 2 (scripts/szyfruj-pary.mjs) zostaną ZASZYFROWANE do plików .enc.

Jawne zdjęcia galerii NIGDY nie trafiają do repo — STAGE jest w scratchpadzie.
Wynik pośredni: BUILD_JSON (dla kroku szyfrującego).

Wymaga: Python 3 + Pillow.  Uruchom:  python scripts/build_pary.py
"""
import os, re, json, sys, random, hashlib
from PIL import Image, ImageOps, features

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r"E:\weddings_SELEKCJA"
OUT_WEB = os.path.join(ROOT, "images", "pary")               # publiczne teasery + .enc (krok 2)
STAGE = os.path.join(
    r"C:\Users\CEOMAR~1\AppData\Local\Temp\claude",
    "C--PROJEKTY-strony-PORTFOLIO-SLUBNE-mariusz-swiergula-fotografia",
    "d0ecfb63-ffee-4317-9c49-0b97f6b8f42f", "scratchpad", "pary_plain")
BUILD_JSON = os.path.join(os.path.dirname(STAGE), "pary_build.json")

N_PHOTOS = 10          # ile zdjęć w galerii (albo mniej, jeśli w folderze jest mniej)
LONG_EDGE = 1800       # długi bok zdjęcia galerii (placeholder — będzie podmieniany)
TEASER_EDGE = 1600     # długi bok teasera (publiczny, na kartę)
Q_JPG, Q_WEBP, Q_AVIF = 82, 82, 60
HAS_AVIF = features.check("avif")
EXTS = (".jpg", ".jpeg", ".png")

# Polskie znaki -> ASCII (do slug/nazw plików)
_MAP = str.maketrans({
    "ą":"a","ć":"c","ę":"e","ł":"l","ń":"n","ó":"o","ś":"s","ż":"z","ź":"z",
    "Ą":"a","Ć":"c","Ę":"e","Ł":"l","Ń":"n","Ó":"o","Ś":"s","Ż":"z","Ź":"z",
})

def log(*a): print(*a, flush=True)

def czysta_nazwa(folder):
    """'2008 SLUB IZA i ŁUKASZ' -> 'Iza i Łukasz'  (zachowuje polskie znaki)."""
    s = re.sub(r"^\s*\d{4}\s*", "", folder)                 # rok precz
    s = re.sub(r"(?i)\b[śs]lub\b\s*", "", s).strip()        # słowo SLUB/ŚLUB precz
    s = re.sub(r"\s+", " ", s)
    def tc(w):
        return (w[:1].upper() + w[1:].lower()) if w else w
    parts = s.split(" ")
    return " ".join("i" if p.lower() == "i" else tc(p) for p in parts)

def slugify(nazwa):
    s = nazwa.translate(_MAP).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "para"

def save_variants(im, base_noext, long_edge):
    w, h = im.size
    scale = min(1.0, long_edge / max(w, h))                 # BEZ upscalingu
    nw, nh = max(1, round(w*scale)), max(1, round(h*scale))
    rim = im.resize((nw, nh), Image.LANCZOS) if scale < 1.0 else im
    rim.save(base_noext + ".jpg", "JPEG", quality=Q_JPG, optimize=True, progressive=True)
    rim.save(base_noext + ".webp", "WEBP", quality=Q_WEBP, method=6)
    if HAS_AVIF:
        rim.save(base_noext + ".avif", "AVIF", quality=Q_AVIF)
    return nw, nh

def save_plain_jpg(im, dest, long_edge):
    w, h = im.size
    scale = min(1.0, long_edge / max(w, h))
    nw, nh = max(1, round(w*scale)), max(1, round(h*scale))
    rim = im.resize((nw, nh), Image.LANCZOS) if scale < 1.0 else im
    rim.save(dest, "JPEG", quality=Q_JPG, optimize=True, progressive=True)
    return nw, nh

def main():
    if not os.path.isdir(SRC):
        log(f"! BRAK ŹRÓDŁA: {SRC}"); sys.exit(1)
    log(f"AVIF: {'TAK' if HAS_AVIF else 'NIE (webp+jpg)'}")
    os.makedirs(OUT_WEB, exist_ok=True)
    os.makedirs(STAGE, exist_ok=True)

    folders = sorted(d for d in os.listdir(SRC) if os.path.isdir(os.path.join(SRC, d)))
    couples, slugs_seen, uwagi = [], {}, []

    for folder in folders:
        nazwa = czysta_nazwa(folder)
        slug = slugify(nazwa)
        if slug in slugs_seen:                              # kolizja slugów
            slugs_seen[slug] += 1
            slug = f"{slug}-{slugs_seen[slug]}"
        else:
            slugs_seen[slug] = 1
        haslo = nazwa.upper()

        src_dir = os.path.join(SRC, folder)
        files = sorted(f for f in os.listdir(src_dir) if f.lower().endswith(EXTS))
        if not files:
            uwagi.append(f"{folder}: brak zdjęć — pominięto"); continue

        rng = random.Random(hashlib.md5(slug.encode("utf-8")).hexdigest())
        pick = files if len(files) <= N_PHOTOS else rng.sample(files, N_PHOTOS)
        pick = sorted(pick)                                  # stabilna kolejność wyświetlania

        # sygnalizuj literówki/braki diakrytyków do ręcznej korekty
        low = nazwa.lower()
        if any(t in low for t in ("konraf", "woleta")) or re.search(r"\bmichal\b|\blukasz\b", low):
            uwagi.append(f"{folder}  ->  \"{nazwa}\"  (hasło: {haslo})  — sprawdź pisownię")

        out_dir = os.path.join(OUT_WEB, slug)
        os.makedirs(out_dir, exist_ok=True)
        stage_dir = os.path.join(STAGE, slug)
        os.makedirs(stage_dir, exist_ok=True)

        log(f"→ {nazwa}  ({slug})  — {len(pick)} zdjęć  [hasło: {haslo}]")

        # teaser = pierwsze wylosowane zdjęcie (publiczne)
        teaser_src = os.path.join(src_dir, pick[0])
        with Image.open(teaser_src) as im0:
            im = ImageOps.exif_transpose(im0).convert("RGB")
            tw, th = save_variants(im, os.path.join(out_dir, "teaser"), TEASER_EDGE)
        teaser = {
            "base": f"images/pary/{slug}/teaser",
            "formats": (["avif"] if HAS_AVIF else []) + ["webp", "jpg"],
            "width": tw, "height": th,
        }

        photos = []
        for i, fn in enumerate(pick, 1):
            with Image.open(os.path.join(src_dir, fn)) as im0:
                im = ImageOps.exif_transpose(im0).convert("RGB")
                dest = os.path.join(stage_dir, f"p{i:02d}.jpg")
                pw, ph = save_plain_jpg(im, dest, LONG_EDGE)
            photos.append({"plain": dest, "name": f"p{i:02d}", "width": pw, "height": ph})

        couples.append({
            "slug": slug, "name": nazwa, "password": haslo,
            "folder": folder, "teaser": teaser,
            "out_dir": out_dir, "photos": photos,
        })

    with open(BUILD_JSON, "w", encoding="utf-8") as f:
        json.dump({"couples": couples}, f, ensure_ascii=False, indent=2)

    log(f"\nGotowe: {len(couples)} par przygotowanych.")
    log(f"BUILD_JSON: {BUILD_JSON}")
    if uwagi:
        log("\n=== UWAGI (do ręcznej korekty nazw/haseł) ===")
        for u in uwagi: log("  • " + u)

if __name__ == "__main__":
    main()
