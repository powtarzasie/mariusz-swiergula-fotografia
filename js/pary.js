/* ============================================================================
   Galerie par — strefa prywatna. Jeden plik, DWA tryby:
   • LISTA  (pary.html): spis kart; klik w kartę = przejście na osobną stronę pary
     /pary/<slug>.html (własny adres do wysłania Parze Młodej).
   • GALERIA (pary/<slug>.html): brama hasła (wbudowana w stronę) + galeria jednej
     pary + lightbox. Tryb rozpoznajemy po atrybucie <body data-para-slug="...">.

   Zdjęcia leżą w repo jako szyfrogram (.enc, AES-GCM). Klucz wyprowadzamy z hasła
   (PBKDF2, wzorzec StatiCrypt jak w strefie HANDPAN). Bez hasła nie da się odczytać
   ani jednego zdjęcia galerii — w źródle są tylko szyfrogramy. Teaser (1 kadr) jawny.
   Po poprawnym haśle zapisujemy KLUCZ (nie hasło) w localStorage, by nie pytać co wizytę.
   ========================================================================== */
(() => {
  "use strict";
  const dane = window.PARY;
  if (!dane) return;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const LS = (slug) => `msf-pary-klucz-${slug}`;
  // localStorage bywa niedostępny (twardo zablokowane ciasteczka / sandbox) — nie wywalaj strony
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* trudno */ } };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch { /* trudno */ } };

  const bySlug = Object.fromEntries(dane.couples.map(c => [c.slug, c]));
  const b64naBajty = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const bajtyNaB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const brakCrypto = !(window.crypto && crypto.subtle);

  document.querySelectorAll("[data-pary-count]").forEach(n => n.textContent = String(dane.couples.length).padStart(2, "0"));

  /* ---- Krypto (wspólne dla obu trybów) ----------------------------------- */
  async function kluczZHasla(haslo, c) {
    const material = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(haslo), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: b64naBajty(c.salt), iterations: c.iterations, hash: "SHA-256" },
      material, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
  }
  async function odszyfrujDoURL(klucz, src) {
    const buf = new Uint8Array(await (await fetch(src, { cache: "force-cache" })).arrayBuffer());
    const iv = buf.slice(0, 12), ct = buf.slice(12);
    const jawne = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, klucz, ct);
    return URL.createObjectURL(new Blob([jawne], { type: "image/jpeg" }));
  }

  /* ---- Wybór trybu ------------------------------------------------------- */
  const paraSlug = document.body.dataset.paraSlug || null;
  if (paraSlug) initGaleria(paraSlug);
  else if (document.getElementById("pary-lista")) initLista();

  /* ======================================================================== *
   *  TRYB LISTA — spis par (pary.html). Karta = link do osobnej strony pary. *
   * ======================================================================== */
  function initLista() {
    const lista = document.getElementById("pary-lista");

    function teaserPicture(t) {
      const pic = el("picture");
      t.formats.filter(x => x !== "jpg").forEach(ext => {
        const s = el("source");
        s.type = ext === "avif" ? "image/avif" : "image/webp";
        s.srcset = `${t.base}.${ext}`;
        pic.appendChild(s);
      });
      const img = el("img");
      img.src = `${t.base}.jpg`;
      img.width = t.width; img.height = t.height;
      img.alt = ""; img.loading = "lazy"; img.decoding = "async";
      pic.appendChild(img);
      return pic;
    }

    lista.innerHTML = "";
    lista.classList.add("pary-grid");
    dane.couples.forEach(c => {
      const odblokowana = !!lsGet(LS(c.slug));
      const card = el("a", "couple-card" + (odblokowana ? " is-unlocked" : ""));
      card.href = `pary/${c.slug}.html`;   // osobna strona pary (ten sam adres bazowy)
      card.setAttribute("aria-label", `${c.name} — ${odblokowana ? "otwórz galerię" : "galeria za hasłem"}`);
      const media = el("div", "couple-card__media");
      media.style.setProperty("--ar", `${c.teaser.width}/${c.teaser.height}`);
      media.appendChild(teaserPicture(c.teaser));
      const badge = el("span", "couple-card__badge", odblokowana
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`);
      media.appendChild(badge);
      const meta = el("div", "couple-card__meta");
      meta.appendChild(el("span", "couple-card__name", c.name));
      meta.appendChild(el("span", "couple-card__hint", odblokowana ? "Otwórz galerię" : "Galeria za hasłem"));
      card.appendChild(media);
      card.appendChild(meta);
      lista.appendChild(card);
    });
  }

  /* ======================================================================== *
   *  TRYB GALERIA — jedna para (pary/<slug>.html).                           *
   *  Brama hasła wbudowana w stronę (nie nakładka) + galeria + lightbox.     *
   * ======================================================================== */
  function initGaleria(slug) {
    const c = bySlug[slug];
    const brama = $("#brama"), bramaForm = $("#brama-form"), bramaHaslo = $("#brama-haslo"),
          bramaBlad = $("#brama-blad"), bramaSubmit = $("#brama-submit");
    const widokGaleria = $("#para-galeria"), gridPary = $("#gallery-pary");
    if (!c) { if (bramaBlad) bramaBlad.textContent = "Nie znaleziono tej galerii."; return; }

    let VIEW = [];        // {url,width,height} — kolejność lightboxa
    let aktywneURLe = []; // do zwolnienia
    const sprzatnijURLe = () => { aktywneURLe.forEach(URL.revokeObjectURL); aktywneURLe = []; };
    // podstrony leżą w /pary/, a ścieżki .enc w manifeście są liczone od katalogu głównego
    const encSrc = (s) => `../${s}`;

    function pokazBrame(komunikat) {
      sprzatnijURLe();
      gridPary.innerHTML = "";
      VIEW = [];
      widokGaleria.hidden = true;
      brama.hidden = false;
      bramaBlad.textContent = komunikat || "";
      if (!komunikat) bramaHaslo.value = "";
      setTimeout(() => bramaHaslo.focus(), 30);
    }

    async function pokazGalerie(klucz, url0) {
      sprzatnijURLe();
      gridPary.innerHTML = "";
      VIEW = [];
      brama.hidden = true;
      widokGaleria.hidden = false;

      for (let i = 0; i < c.photos.length; i++) {
        const p = c.photos[i];
        let url;
        try { url = (i === 0 && url0) ? url0 : await odszyfrujDoURL(klucz, encSrc(p.src)); }
        catch { continue; }
        aktywneURLe.push(url);
        const idx = VIEW.length;
        VIEW.push({ url, width: p.width, height: p.height });
        const tile = el("button", "p-tile");
        tile.type = "button";
        // jednolita, pozioma proporcja kafelka (3:2) ustawia CSS — nie proporcje oryginału
        tile.setAttribute("aria-label", `Powiększ zdjęcie ${idx + 1}`);
        const img = el("img");
        img.src = url; img.alt = ""; img.loading = "lazy"; img.decoding = "async";
        tile.appendChild(img);
        tile.addEventListener("click", () => openLightbox(idx));
        gridPary.appendChild(tile);
      }
      if (VIEW.length === 0) {
        // żaden kadr się nie odszyfrował (np. nieświeży klucz) — nie pokazuj pustej galerii,
        // tylko wyczyść klucz i poproś o hasło ponownie
        lsDel(LS(slug));
        pokazBrame("Zapamiętane hasło wygasło — wpisz je jeszcze raz.");
      }
    }

    // Wejście na stronę: jeśli mamy zapamiętany klucz, ZWERYFIKUJ go (importKey nie rzuca
    // dla nieświeżego klucza) odszyfrowaniem pierwszego kadru; inaczej pokaż bramę.
    (async () => {
      const zapis = lsGet(LS(slug));
      if (!zapis) { pokazBrame(); return; }
      try {
        const klucz = await crypto.subtle.importKey("raw", b64naBajty(zapis), { name: "AES-GCM" }, false, ["decrypt"]);
        const url0 = await odszyfrujDoURL(klucz, encSrc(c.photos[0].src));
        await pokazGalerie(klucz, url0);
      } catch {
        lsDel(LS(slug));
        pokazBrame();
      }
    })();

    bramaForm.addEventListener("submit", async e => {
      e.preventDefault();
      if (brakCrypto) { bramaBlad.textContent = "Ta przeglądarka nie obsługuje odszyfrowania (wymagany HTTPS)."; return; }
      const haslo = bramaHaslo.value.trim().replace(/\s+/g, " ").toUpperCase();
      if (!haslo) { bramaBlad.textContent = "Wpisz hasło."; return; }
      bramaBlad.textContent = "";
      bramaSubmit.disabled = true; bramaSubmit.textContent = "Sprawdzam…";
      try {
        const klucz = await kluczZHasla(haslo, c);
        // weryfikacja: spróbuj odszyfrować pierwszy kadr (zły klucz => wyjątek na tagu AES-GCM)
        const url0 = await odszyfrujDoURL(klucz, encSrc(c.photos[0].src));
        try {
          const surowy = await crypto.subtle.exportKey("raw", klucz);
          lsSet(LS(slug), bajtyNaB64(surowy));
        } catch { /* eksport klucza się nie udał — trudno */ }
        await pokazGalerie(klucz, url0);
      } catch {
        bramaBlad.textContent = "Nieprawidłowe hasło. Spróbuj jeszcze raz.";
        bramaHaslo.select();
      } finally {
        bramaSubmit.disabled = false; bramaSubmit.textContent = "Otwórz galerię";
      }
    });

    $("#zablokuj")?.addEventListener("click", () => { lsDel(LS(slug)); pokazBrame(); });

    /* ---- Lightbox (na blob-URLach tej galerii) --------------------------- */
    const lb = $("#lightbox"), lbStage = $("#lb-stage"), lbCount = $("#lb-count"), lbThumbs = $("#lb-thumbs");
    let current = 0, lbFokus = null;

    function buildThumbs() {
      lbThumbs.innerHTML = "";
      VIEW.forEach((it, i) => {
        const im = el("img"); im.src = it.url; im.alt = ""; im.dataset.i = i;
        im.addEventListener("click", () => show(i));
        lbThumbs.appendChild(im);
      });
    }
    function openLightbox(i) {
      if (!VIEW.length) return;
      lbFokus = document.activeElement;
      buildThumbs();
      lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
      show(i);
      $("#lb-close").focus();
    }
    function show(i) {
      current = (i + VIEW.length) % VIEW.length;
      const it = VIEW[current];
      const fig = $("#lb-fig");
      fig.querySelector(".lb__img-wrap")?.remove();
      const wrap = el("div", "lb__img-wrap");
      const img = el("img"); img.className = "lb__img"; img.src = it.url; img.alt = "";
      img.addEventListener("load", () => img.classList.add("ready"), { once: true });
      if (img.complete) img.classList.add("ready");
      wrap.appendChild(img);
      fig.prepend(wrap);
      $("#lb-cap").style.display = "none";
      lbCount.innerHTML = `<b>${String(current + 1).padStart(2, "0")}</b> / ${String(VIEW.length).padStart(2, "0")}`;
      lbThumbs.querySelectorAll("img").forEach(t => t.classList.toggle("is-current", +t.dataset.i === current));
      lbThumbs.querySelector(".is-current")?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
    }
    function closeLightbox() {
      lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true");
      document.body.classList.remove("no-scroll");
      lbFokus?.focus();
    }
    function trapFocus(kontener, e) {
      const f = [...kontener.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')]
        .filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const pierwszy = f[0], ostatni = f[f.length - 1];
      if (e.shiftKey && document.activeElement === pierwszy) { e.preventDefault(); ostatni.focus(); }
      else if (!e.shiftKey && document.activeElement === ostatni) { e.preventDefault(); pierwszy.focus(); }
    }
    const next = () => show(current + 1);
    const prev = () => show(current - 1);
    $("#lb-close").addEventListener("click", closeLightbox);
    $("#lb-next").addEventListener("click", next);
    $("#lb-prev").addEventListener("click", prev);
    lb.addEventListener("click", e => { if (e.target === lb || e.target === lbStage) closeLightbox(); });
    document.addEventListener("keydown", e => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Tab") trapFocus(lb, e);
    });
    let x0 = null;
    lbStage.addEventListener("touchstart", e => { x0 = e.changedTouches[0].clientX; }, { passive: true });
    lbStage.addEventListener("touchend", e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) (dx < 0 ? next() : prev());
      x0 = null;
    }, { passive: true });
  }
})();
