# Mariusz Świergula — Fotografia ślubna i rodzinna

Statyczne portfolio premium. Zdjęcia są bohaterem, design jest ramą.
Bez frameworków, bez builda — czysty **HTML + CSS + JS**. Galeria, lightbox i podgląd
renderują się z jednego manifestu `data/gallery.json`.

> Hasło: **„Historie zapisane światłem i emocjami”**

---

## 1. Struktura plików

```
mariusz-swiergula-fotografia/
├─ index.html                  # Home: hero · 2 wejścia · manifest · wybrane kadry · o mnie · warsztat · kontakt
├─ sluby.html                  # Galeria: Śluby (hero + masonry + lightbox)
├─ rodzina.html                # Galeria: Rodzina (hero + masonry + lightbox)
├─ polityka-prywatnosci.html   # Polityka prywatności (RODO)
├─ css/style.css               # Cały design system (tokeny, komponenty, galeria, lightbox)
├─ js/
│  ├─ main.js                  # Nawigacja, menu mobilne, reveal sekcji, rok w stopce
│  └─ gallery.js               # Render galerii z manifestu: masonry + lightbox (klawiatura, swipe, miniatury)
├─ data/gallery.json           # JEDYNE źródło prawdy dla galerii (generowane przez skrypt)
├─ scripts/optimize.py         # Optymalizacja zdjęć + generator manifestu (Python + Pillow)
├─ images/
│  ├─ optimized/               # ⟵ to serwuje strona: <id>-{mobile|desktop|full}.{avif|webp|jpg}
│  ├─ home/og-image.jpg        # Obraz Open Graph (generowany)
│  ├─ weddings/ family/ about/ # Oryginały (wejście do skryptu; w .gitignore)
├─ assets/favicon.svg          # Monogram „M”
├─ .nojekyll                   # GitHub Pages: nie przetwarzaj przez Jekyll
└─ .gitignore
```

## 2. Uruchomienie lokalnie

Najprościej: **otwórz `index.html` w przeglądarce** (dwuklik). Manifest ładuje się jako
`<script>` (`data/gallery.js`), więc galerie działają też z dysku (`file://`).

Do testów „jak na produkcji" (i przy edycji manifestu) wygodniej użyć serwera HTTP:
```bash
# w katalogu projektu:
python -m http.server 8765
# następnie otwórz:  http://localhost:8765/
```
(Dowolny statyczny serwer zadziała: `npx serve`, Live Server w VS Code itd.)

> `data/gallery.json` pozostaje czytelnym źródłem prawdy; `data/gallery.js` to jego
> kopia opakowana w `window.GALLERY` (oba generuje `scripts/optimize.py`).

## 3. Dodawanie zdjęć

Wszystko opisuje **jedna lista `PHOTOS`** w `scripts/optimize.py`. Dopisz wiersz:

```python
("w-25","weddings","NAZWA_PLIKU.jpg",["plener","emocje"],"grid",
 "opis alt po polsku","Podpis w lightboxie","normal"),
#  id     sekcja      plik źródłowy        tagi(meta)         rola   alt                  caption           span
```
- **id** — unikalny (`w-…` śluby, `f-…` rodzina).
- **sekcja** — `weddings | family | about`.
- **plik źródłowy** — nazwa w katalogu źródłowym (`ORIGINAL_SRC` w skrypcie) lub w `images/<sekcja>/`.
- **span** — `big`/`wide` = duży kadr (2 kolumny na desktopie), `tall`/`normal` = standard.

Potem uruchom skrypt (patrz pkt 6). Manifest i warianty zaktualizują się same.

## 4. Podmiana zdjęcia

Najprościej: podmień plik oryginału w `images/<sekcja>/<id>.<ext>` (np. `images/weddings/w-07.jpg`)
i uruchom skrypt — nowszy czas modyfikacji wymusi regenerację tylko tego kadru.
(Albo podmień plik źródłowy i zaktualizuj nazwę w `PHOTOS`.)

## 5. Optymalizacja do web

```bash
python scripts/optimize.py
```
Skrypt dla każdego zdjęcia tworzy: **mobile ~1200px / desktop ~2000px / full ~2560px**
(dłuższy bok, **bez upscalingu**) w formatach **AVIF + WebP + JPG** (sRGB), zapisuje je do
`images/optimized/`, generuje OG image oraz `data/gallery.json`.
Re-run jest **przyrostowy** — pomija to, co aktualne.

> Wymaga: `pip install Pillow` (z obsługą AVIF/WebP — Pillow ≥ 11.3).

## 6. Publikacja na GitHub Pages

1. Utwórz repozytorium i wypchnij pliki:
   ```bash
   git init && git add . && git commit -m "Portfolio"
   git branch -M main
   git remote add origin https://github.com/UŻYTKOWNIK/REPO.git
   git push -u origin main
   ```
2. GitHub → **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   gałąź `main`, katalog `/ (root)`.
3. Strona ruszy pod `https://UŻYTKOWNIK.github.io/REPO/`.
   - Ścieżki są **względne**, więc działa zarówno w korzeniu domeny, jak i w podkatalogu `/REPO/`.
   - `.nojekyll` jest dołączony (nie psuje plików/katalogów).

> **Zamień placeholdery** `https://example.com` w `<link rel="canonical">` i metach `og:*`
> na docelowy adres (4 pliki HTML) — ważne dla SEO/podglądu w social.

## 7. Checklista przed publikacją

- [ ] `python scripts/optimize.py` przeszło bez błędów; `data/gallery.json` aktualny.
- [ ] Podmienione `https://example.com` → docelowa domena (canonical + OG, 4× HTML).
- [ ] Uzupełnione dane w `polityka-prywatnosci.html` (pełna nazwa/adres/NIP jeśli dotyczy).
- [ ] Sprawdzone na 375 px i na desktopie; menu mobilne działa; lightbox (klawiatura + swipe).
- [ ] Hero ≤ 300 KB (AVIF ~104 KB ✔), brak błędów w konsoli, brak 404.
- [ ] (Opcjonalnie) self-hosting czcionek, by nie przekazywać IP do Google Fonts.

## 8. Selekcja zdjęć (skrót)

Kuratorska selekcja z 168 zdjęć → **49 kadrów**:
- **Śluby — 23** (ostra selekcja; archiwum było stylistycznie niespójne, więc trzymam jeden,
  ciepły/cinematic ton; odrzucone: przepalona zieleń, HDR-niebo, fisheye, pomarańczowy cast).
- **Rodzina — 26** (pełniejsza, spójna narracja: noworodki → bliskość → dom → lifestyle).
- Galerie mają **osobny charakter**: Śluby = cinematic/złota godzina; Rodzina = ciepło, miękko, intymnie.
- Zdjęcie „O mnie” = `images/about/a-01.jpg` (czarno-białe: autor z żoną i córką).

---

### Dane kontaktowe użyte na stronie
E-mail `mariusz.swiergula@gmail.com` · tel. `+48 600 353 150`.
Linki do social mediów celowo **usunięte** (brak profili) — dodasz je w stopkach, gdy będą.
