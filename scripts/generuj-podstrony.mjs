// Galerie par — generator OSOBNYCH STRON par: pary/<slug>.html (jedna strona na parę,
// własny adres do wysłania Parze Młodej). Czyta manifest data/pary.js (window.PARY) i
// tworzy z jednego szablonu po pliku na parę. Uruchamiaj PO każdej zmianie manifestu:
//   node scripts/generuj-podstrony.mjs
// Strony są prywatne (noindex) i i tak wymagają hasła — w źródle są tylko szyfrogramy.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TUTAJ = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TUTAJ, '..');
const V = '20260721b';   // stempel wersji css/js (BUMPUJ przy zmianie stylów/skryptu strefy par)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function strona(c) {
  const NAZWA = esc(c.name);
  const SLUG = c.slug;
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0B0B0C">
<title>${NAZWA} — Galeria prywatna — Mariusz Świergula Fotografia</title>
<meta name="description" content="Prywatna galeria pary ${NAZWA}. Pełna galeria po wpisaniu hasła otrzymanego od fotografa.">
<!-- Strefa prywatna: nie indeksować -->
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../css/style.css?v=${V}">
</head>
<body data-para-slug="${SLUG}">
<a class="skip" href="#main">Przejdź do treści</a>

<header class="nav">
  <button class="nav__toggle" aria-label="Otwórz menu" aria-expanded="false" aria-controls="menu"><span></span><span></span><span></span></button>
  <a class="brand" href="../index.html" aria-label="Mariusz Świergula Fotografia — strona główna">
    <span class="brand__mono">M</span>
    <span class="brand__name">Mariusz Świergula</span>
    <span class="brand__sub">Fotografia</span>
  </a>
  <nav class="nav__links" aria-label="Główne">
    <a class="nav__link" href="../sluby.html">Śluby</a>
    <a class="nav__link" href="../rodzina.html">Rodzina</a>
    <a class="nav__link" href="../index.html#o-mnie">O mnie</a>
    <a class="nav__link" href="../index.html#kontakt">Kontakt</a>
  </nav>
</header>
<div class="menu" id="menu" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Menu">
  <button class="menu__close" aria-label="Zamknij menu">Zamknij ✕</button>
  <a href="../sluby.html">Śluby</a>
  <a href="../rodzina.html">Rodzina</a>
  <a href="../index.html#o-mnie">O mnie</a>
  <a href="../index.html#kontakt">Kontakt</a>
  <span class="menu__foot">Historie zapisane światłem i emocjami</span>
</div>

<main id="main">
  <!-- NAGŁÓWEK STRONY PARY -->
  <section class="pary-head">
    <div class="wrap">
      <a class="back" href="../pary.html"><span class="arrow" aria-hidden="true"></span> Wszystkie pary</a>
      <span class="kicker">Galeria prywatna</span>
      <h1>${NAZWA}</h1>
    </div>
  </section>

  <section class="pary-sekcja">
    <div class="wrap">
      <!-- BRAMA HASŁA (wbudowana w stronę; widoczna, gdy brak zapamiętanego klucza) -->
      <div id="brama" class="brama-inline" hidden>
        <div class="brama__panel">
          <svg class="brama__klodka" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>
          </svg>
          <span class="kicker">Wpisz hasło</span>
          <h2 class="brama__tytul">Galeria prywatna</h2>
          <p class="brama__opis">Podaj hasło otrzymane od fotografa, aby zobaczyć pełną galerię tej pary.</p>
          <form class="brama__form" id="brama-form" novalidate>
            <label for="brama-haslo" class="sr-only">Hasło</label>
            <input type="password" id="brama-haslo" name="haslo" autocomplete="off" autocapitalize="characters"
                   spellcheck="false" placeholder="Hasło do galerii" aria-describedby="brama-blad">
            <button type="submit" class="btn btn--solid" id="brama-submit">Otwórz galerię</button>
          </form>
          <p class="brama__blad" id="brama-blad" role="alert"></p>
        </div>
      </div>

      <!-- GALERIA (widoczna po poprawnym haśle) -->
      <div id="para-galeria" class="para-galeria" hidden>
        <div class="para-galeria__pasek">
          <a class="back back--btn" href="../pary.html"><span class="arrow" aria-hidden="true"></span> Wszystkie pary</a>
          <h2 class="para-galeria__tytul">${NAZWA}</h2>
          <button type="button" class="para-galeria__lock" id="zablokuj" title="Zablokuj tę galerię na tym urządzeniu">Zablokuj</button>
        </div>
        <div id="gallery-pary" class="pary-masonry"></div>
      </div>
    </div>
  </section>
</main>

<!-- LIGHTBOX -->
<div class="lightbox" id="lightbox" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Podgląd zdjęcia">
  <div class="lb__top">
    <span class="lb__count" id="lb-count"></span>
    <button class="lb__close" id="lb-close" aria-label="Zamknij podgląd">Zamknij
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
  </div>
  <div class="lb__stage" id="lb-stage">
    <button class="lb__nav lb__nav--prev" id="lb-prev" aria-label="Poprzednie zdjęcie">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
    </button>
    <figure class="lb__fig" id="lb-fig">
      <figcaption class="lb__cap" id="lb-cap"></figcaption>
    </figure>
    <button class="lb__nav lb__nav--next" id="lb-next" aria-label="Następne zdjęcie">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
    </button>
  </div>
  <div class="lb__thumbs" id="lb-thumbs" aria-hidden="true"></div>
</div>

<footer class="footer">
  <div class="wrap footer__grid">
    <div class="footer__mono">M</div>
    <div class="footer__meta">
      <span>© <span data-year>2026</span> Mariusz Świergula Fotografia</span>
      <a href="../pary.html" class="link" style="font-size:.7rem">Wszystkie pary</a>
      <a href="../polityka-prywatnosci.html" class="link" style="font-size:.7rem">Polityka prywatności</a>
    </div>
  </div>
</footer>

<script src="../data/pary.js" defer></script>
<script src="../js/pary.js?v=${V}" defer></script>
<script src="../js/main.js" defer></script>
</body>
</html>
`;
}

const txt = await readFile(join(ROOT, 'data', 'pary.js'), 'utf8');
const manifest = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
await mkdir(join(ROOT, 'pary'), { recursive: true });
let n = 0;
for (const c of manifest.couples) {
  await writeFile(join(ROOT, 'pary', `${c.slug}.html`), strona(c), 'utf8');
  console.log('  strona:', c.slug, '—', c.name);
  n++;
}
console.log(`\nGotowe: ${n} stron w /pary (stempel v=${V})`);
