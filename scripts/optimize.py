#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mariusz Świergula Fotografia — optymalizacja zdjęć + generator manifestu.

Jedno źródło prawdy: lista PHOTOS poniżej (kuratorska selekcja).
Skrypt:
  1. bootstrapuje oryginały: kopiuje wybrane pliki ze źródła do images/<sekcja>/<id>.<ext>
     (jeśli już są w repo — pomija; możesz podmienić plik i uruchomić ponownie),
  2. generuje warianty mobile(1200) / desktop(2000) / full(2560) — dłuższy bok, BEZ upscalingu,
     w formatach AVIF + WebP + JPG (sRGB), do images/optimized/,
  3. zapisuje manifest data/gallery.json (galeria/filtry/lightbox renderują się z niego).

OG image (images/home/og-image.jpg) robi osobny scripts/make_og.py (brandowana grafika z typografią).
Zdjęcia z rolą "home" są optymalizowane, ale pomijane w galerii (slot dekoracyjny na stronie głównej).

Wymaga: Python 3 + Pillow (pip install Pillow).  Uruchom:  python scripts/optimize.py
"""
import os, json, shutil, sys
from PIL import Image, ImageOps, features

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Katalog z oryginałami (źródło spoza repo). Po pierwszym uruchomieniu repo jest samowystarczalne.
ORIGINAL_SRC = r"C:\ClaudeSANDDBOX\STRONA SLUB"
SECTION_SRCDIR = {"weddings": "SLUB", "family": "FAMILY", "about": ""}

SIZES = {"mobile": 1200, "desktop": 2000, "full": 2560}
Q_JPG, Q_WEBP, Q_AVIF = 82, 82, 60

HAS_AVIF = features.check("avif")

# ── KURATORSKA SELEKCJA ──────────────────────────────────────────────────────
# id, sekcja, plik źródłowy, tagi, rola (hero|grid|about), alt (PL), podpis, span(big|wide|tall|normal)
PHOTOS = [
    # ŚLUBY (24) — ton cinematic/ciepły, sylwetki, emocje, akcenty B&W
    ("w-01","weddings","IMG_0092.jpg",["plener","emocje"],"hero","Para młoda całuje się w polu w ciepłym świetle zachodzącego słońca","Złota godzina","big"),
    ("w-02","weddings","IMG_0019.jpg",["plener","emocje"],"grid","Sylwetka pary młodej na tle zachodu słońca nad wodą","Cisza przed zmierzchem","wide"),
    ("w-03","weddings","IMG_0089.jpg",["plener"],"grid","Para młoda brodzi w wodzie o zachodzie słońca, pastelowe barwy","Brzegiem","wide"),
    ("w-04","weddings","IMG_0108.jpg",["plener","emocje"],"grid","Pocałunek pary młodej w kontrze, rozbłysk słońca","Pod słońce","tall"),
    ("w-05","weddings","IMG_0025.jpg",["plener","emocje"],"grid","Pocałunek pary młodej jako sylwetka na tle zachodu","O zmierzchu","normal"),
    ("w-06","weddings","IMG_0024.jpg",["plener"],"grid","Para młoda w miękkim, złotym świetle","Ciepłe światło","normal"),
    ("w-07","weddings","IMG_0095.jpg",["plener"],"grid","Panna młoda nad jeziorem o zachodzie słońca","Nad wodą","normal"),
    ("w-08","weddings","IMG_0102.jpg",["plener","emocje"],"grid","Sylwetka pary w kamiennym przejściu pod słońce","W kamiennym łuku","normal"),
    ("w-09","weddings","IMG_0004.jpg",["emocje"],"grid","Wzruszony pan młody w czułym uścisku","Wzruszenie","normal"),
    ("w-10","weddings","IMG_0015.jpg",["emocje"],"grid","Czuły uścisk pary młodej","Blisko","normal"),
    ("w-11","weddings","IMG_0031.jpg",["emocje"],"grid","Pocałunek pary młodej w otoczeniu bliskich","Małe gesty","normal"),
    ("w-12","weddings","IMG_0048.jpg",["przygotowania"],"grid","Portret panny młodej w welonie w miękkim świetle","Przed ceremonią","normal"),
    ("w-13","weddings","IMG_0049.jpg",["przygotowania"],"grid","Bliski portret panny młodej","Spojrzenie","normal"),
    ("w-14","weddings","IMG_0050.jpg",["przygotowania","emocje"],"grid","Panna młoda w zamyśleniu, miękkie światło","Chwila dla siebie","normal"),
    ("w-15","weddings","IMG_0069.jpg",["emocje"],"grid","Para młoda przytulona, twarzą w twarz","Czułość","wide"),
    ("w-16","weddings","IMG_0090.jpg",["plener"],"grid","Profil panny młodej w delikatnym świetle","Profil","normal"),
    ("w-17","weddings","IMG_0037.jpg",["plener"],"grid","Para młoda na ścieżce wśród drzew, czarno-białe","Spacer","tall"),
    ("w-18","weddings","IMG_0053.jpg",["ceremonia","emocje"],"grid","Para młoda podczas ceremonii, czarno-białe","Przysięga","normal"),
    ("w-20","weddings","IMG_0045.jpg",["ceremonia"],"grid","Wejście do kościoła, perspektywa nawy","Nawa","tall"),
    ("w-21","weddings","IMG_0036.jpg",["plener","emocje"],"grid","Para młoda z dzieckiem jesienią","Razem","normal"),
    ("w-22","weddings","IMG_0054.jpg",["detale"],"grid","Obrączki ślubne — detal","Obrączki","normal"),
    ("w-23","weddings","IMG_0094.jpg",["plener","emocje"],"grid","Pocałunek pary młodej pod słońce","Pocałunek","normal"),
    ("w-24","weddings","IMG_0043.jpg",["przygotowania"],"grid","Panna młoda i welon pod światło, czarno-białe","Ostatnie chwile","normal"),

    # Slot dekoracyjny strony głównej (rola "home" → poza galerią): sekcja „Podejście / czekam na nie"
    ("w-25","weddings","IMG_0005.jpg",["plener","emocje"],"home","Para młoda całuje się w wysokiej trawie, miękkie, marzycielskie światło","Czekam na nie","normal"),

    # RODZINA (26) — ciepło, miękko, naturalne światło, intymność
    ("f-01","family","MS_03664.JPEG",["bliskosc","noworodki","dom"],"hero","Mama z niemowlęciem przy oknie w porannym świetle","Światło poranka","big"),
    ("f-02","family","IMG_9962.JPEG",["bliskosc","rodzina","dom"],"grid","Mama przytula dziecko przy regale z książkami","Przytulenie","wide"),
    ("f-03","family","IMG_0739.JPEG",["noworodki","bliskosc"],"grid","Dłonie rodziców obejmujące śpiące niemowlę, czarno-białe","Pierwsze dni","tall"),
    ("f-04","family","IMG_3987.JPEG",["noworodki","rodzina","bliskosc"],"grid","Tata trzyma noworodka przy twarzy","Tata","normal"),
    ("f-05","family","IMG_9833.JPEG",["noworodki","bliskosc","dom"],"grid","Mama z niemowlęciem przy oknie","Blisko","normal"),
    ("f-06","family","IMG_9837.JPEG",["noworodki","bliskosc"],"grid","Rodzic z niemowlęciem w domowym świetle","Czułość codzienności","normal"),
    ("f-07","family","IMG_6546.JPEG",["noworodki"],"grid","Niemowlę otulone kocem, czarno-białe","Otulone","normal"),
    ("f-08","family","IMG_6592.JPEG",["noworodki","dom"],"grid","Niemowlę śpiące w dzianinowym kocu","Sen","wide"),
    ("f-09","family","IMG_2923.JPEG",["bliskosc","dom"],"grid","Mama z niemowlęciem na łóżku","Razem","normal"),
    ("f-10","family","IMG_2998.JPEG",["lifestyle","dom"],"grid","Niemowlę w wannie podczas kąpieli","Kąpiel","normal"),
    ("f-11","family","IMG_3184.JPEG",["lifestyle","dom"],"grid","Roześmiane niemowlę podczas kąpieli","Radość","normal"),
    ("f-12","family","IMG_9967_jpg.JPEG",["bliskosc","rodzina"],"grid","Mama z dzieckiem, bliski kadr","Mama","tall"),
    ("f-13","family","IMG_0580.JPEG",["lifestyle","bliskosc"],"grid","Mama unosi dziecko w ogrodzie, rozmyte tło","W ogrodzie","normal"),
    ("f-14","family","IMG_8102.JPEG",["rodzina","bliskosc"],"grid","Dziewczynka trzyma młodsze dziecko w ogrodzie","Rodzeństwo","normal"),
    ("f-15","family","IMG_9918.JPEG",["rodzina","lifestyle"],"grid","Mama z dwójką dzieci w parku","Spacer","tall"),
    ("f-16","family","IMG_0941.JPEG",["rodzina"],"grid","Dziadkowie z wnukami przy stole","Pokolenia","tall"),
    ("f-17","family","IMG_8650_jpg.JPEG",["lifestyle","dom"],"grid","Dziewczynka bawi się w piżamie w porannym świetle","Poranek","tall"),
    ("f-18","family","IMG_9604.JPEG",["lifestyle","dom"],"grid","Dziecko bawi się w ciepłym świetle","Cicha gra","normal"),
    ("f-19","family","IMG_2412.JPEG",["lifestyle","dom"],"grid","Dziewczynka w okularach przeciwsłonecznych w porannym świetle","Mały świat","tall"),
    ("f-20","family","IMG_8781.JPEG",["lifestyle","dom"],"grid","Roześmiany maluch w fotelu","Śmiech","normal"),
    ("f-21","family","IMG_1516_jpg.JPEG",["lifestyle"],"grid","Dziecko w jesiennym lesie","Jesień","tall"),
    ("f-22","family","IMG_1645_jpg.JPEG",["lifestyle","bliskosc"],"grid","Mama z dzieckiem przy huśtawce w parku","Huśtawka","wide"),
    ("f-23","family","IMG_4778.JPEG",["lifestyle"],"grid","Portret małej dziewczynki","Spojrzenie","normal"),
    ("f-24","family","IMG_9578.JPEG",["bliskosc","dom","rodzina"],"grid","Tata bawi się z córką w domu","Zabawa z tatą","wide"),
    ("f-25","family","IMG_8447_jpg.JPEG",["bliskosc"],"grid","Sylwetka mamy z dzieckiem w drzwiach, czarno-białe","W drzwiach","tall"),
    ("f-26","family","IMG_2617.JPEG",["lifestyle"],"grid","Płaczący maluch — szczery moment","Prawdziwe emocje","normal"),

    # O MNIE
    ("a-01","about","O mnie.JPEG",[],"about","Mariusz Świergula z żoną i córką, fotografia czarno-biała","","normal"),
]

def log(*a): print(*a, flush=True)

def bootstrap_original(pid, section, srcfile):
    """Kopiuje oryginał do images/<section>/<id><ext> jeśli go tam nie ma."""
    ext = os.path.splitext(srcfile)[1].lower()
    if ext == ".jpeg": ext = ".jpg"
    dest_dir = os.path.join(ROOT, "images", section)
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, pid + ext)
    if os.path.exists(dest):
        return dest
    src = os.path.join(ORIGINAL_SRC, SECTION_SRCDIR[section], srcfile)
    if not os.path.exists(src):
        log(f"  ! BRAK ORYGINAŁU: {src}")
        return None
    shutil.copy2(src, dest)
    return dest

def save_variants(im, base_noext, long_edge, src_mtime):
    """Zapisuje avif/webp/jpg dla jednego rozmiaru. Pomija, jeśli wynik aktualny.
    (Re-run jest przyrostowy; podmiana oryginału => regeneracja, bo nowszy mtime.)"""
    w, h = im.size
    scale = min(1.0, long_edge / max(w, h))     # BEZ upscalingu
    nw, nh = max(1, round(w*scale)), max(1, round(h*scale))
    exts = [".jpg", ".webp"] + ([".avif"] if HAS_AVIF else [])
    if all(os.path.exists(base_noext + e) for e in exts) and os.path.getmtime(base_noext + ".jpg") >= src_mtime:
        return (nw, nh)
    rim = im.resize((nw, nh), Image.LANCZOS) if scale < 1.0 else im
    rim.save(base_noext + ".jpg", "JPEG", quality=Q_JPG, optimize=True, progressive=True)
    rim.save(base_noext + ".webp", "WEBP", quality=Q_WEBP, method=6)
    if HAS_AVIF:
        rim.save(base_noext + ".avif", "AVIF", quality=Q_AVIF)
    return (nw, nh)

def process(pid, section, srcfile, tags, role, alt, caption, span):
    orig = bootstrap_original(pid, section, srcfile)
    if not orig: return None
    src_mtime = os.path.getmtime(orig)
    with Image.open(orig) as im0:
        im = ImageOps.exif_transpose(im0).convert("RGB")
        W, H = im.size  # intrinsic po korekcie orientacji
        opt = os.path.join(ROOT, "images", "optimized")
        os.makedirs(opt, exist_ok=True)
        out_dims = {}
        for name, edge in SIZES.items():
            base = os.path.join(opt, f"{pid}-{name}")
            out_dims[name] = save_variants(im, base, edge, src_mtime)
        # OG image: generuje dedykowany scripts/make_og.py (brandowana grafika z typografią).
        # NIE robimy tu prostego centralnego cropu, by nie nadpisać wersji z hasłem.
    formats = (["avif"] if HAS_AVIF else []) + ["webp", "jpg"]
    item = {
        "id": pid, "section": section, "tags": tags, "role": role,
        "alt": alt, "caption": caption, "span": span,
        "width": W, "height": H,
        "src": {
            "mobile":  f"images/optimized/{pid}-mobile.jpg",
            "desktop": f"images/optimized/{pid}-desktop.jpg",
            "full":    f"images/optimized/{pid}-full.jpg",
        },
        "base": f"images/optimized/{pid}",
        "formats": formats,
        "px": {k: max(v) for k, v in out_dims.items()},
    }
    return item

def main():
    log(f"AVIF: {'TAK' if HAS_AVIF else 'NIE (tylko webp+jpg)'}")
    items = []
    for rec in PHOTOS:
        pid = rec[0]
        log("→", pid, rec[2])
        it = process(*rec)
        if it: items.append(it)
    # manifest: tylko galeria (weddings+family); about i sloty „home" pomijamy w gallery.json
    gallery = [i for i in items if i["section"] in ("weddings", "family") and i["role"] != "home"]
    manifest = {
        "meta": {"brand": "Mariusz Świergula Fotografia", "count": len(gallery)},
        "items": gallery,
    }
    with open(os.path.join(ROOT, "data", "gallery.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    # Wariant jako <script> — działa też przy otwarciu pliku z dysku (file://),
    # gdzie przeglądarka blokuje fetch() lokalnego JSON-a.
    with open(os.path.join(ROOT, "data", "gallery.js"), "w", encoding="utf-8") as f:
        f.write("/* Generowane automatycznie przez scripts/optimize.py — nie edytuj ręcznie. */\n")
        f.write("window.GALLERY = ")
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    log(f"\nGotowe: {len(gallery)} kadrów w manifeście.")

    # raport wagi największych assetów hero (budżet ≤300KB)
    for hid in ("w-01", "f-01"):
        for ext in ("avif", "webp", "jpg"):
            p = os.path.join(ROOT, "images", "optimized", f"{hid}-desktop.{ext}")
            if os.path.exists(p):
                log(f"  {hid}-desktop.{ext}: {os.path.getsize(p)//1024} KB")

if __name__ == "__main__":
    main()
