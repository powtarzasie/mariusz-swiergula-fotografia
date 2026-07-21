/* ============================================================================
   Galerie par — strefa prywatna.
   Zdjęcia leżą w repo jako szyfrogram (.enc, AES-GCM). Klucz wyprowadzamy z hasła
   (PBKDF2, wzorzec StatiCrypt jak w strefie HANDPAN). Bez hasła nie da się odczytać
   ani jednego zdjęcia galerii — w źródle są tylko szyfrogramy. Teaser (1 kadr) jest jawny.
   Po poprawnym haśle zapisujemy KLUCZ (nie hasło) w localStorage, by nie pytać co wizytę.

   Warstwa „dostarcz + pozwól się podzielić" (bez zmiany szyfrowania):
   • patchwork w NATYWNYCH proporcjach (żaden kadr nie jest przycięty) + hero,
   • z lightboxa: „Wyślij / zapisz" (systemowe udostępnianie odszyfrowanego pliku
     z dyskretnym podpisem wtapianym przez canvas — podgląd zostaje czysty) oraz
     „Skopiuj link" (deep-link ?para=<slug>#foto-N, który NIE omija hasła),
   • obcy z linku trafia na oznaczoną marką bramę z zablokowanymi kaflami.
   ========================================================================== */
(() => {
  "use strict";
  const dane = window.PARY;
  const lista = document.getElementById("pary-lista");
  if (!dane || !lista) return;

  /* Podpis wtapiany w WYSYŁANĄ/ZAPISYWANĄ kopię (nie w podgląd). Jedna stała — łatwo zmienić. */
  const PODPIS = "fot. Mariusz Świerguła · 600 353 150";
  const UDOSTEP_TEXT = "Zdjęcie z naszej galerii ślubnej";

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const LS = (slug) => `msf-pary-klucz-${slug}`;
  // localStorage bywa niedostępny (twardo zablokowane ciasteczka / sandbox) — nie wywalaj strony
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* trudno */ } };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch { /* trudno */ } };

  const paryHead = document.querySelector(".pary-head");   // nagłówek listy — chowamy go w widoku galerii/bramy (bez dublowania <h1>)
  const bySlug = Object.fromEntries(dane.couples.map(c => [c.slug, c]));
  const b64naBajty = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const bajtyNaB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const brakCrypto = !(window.crypto && crypto.subtle);

  document.querySelectorAll("[data-pary-count]").forEach(n => n.textContent = String(dane.couples.length).padStart(2, "0"));

  /* ---- Karty par --------------------------------------------------------- */
  function teaserPicture(t, eager) {
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
    img.alt = ""; img.decoding = "async";
    if (eager) { img.loading = "eager"; img.fetchPriority = "high"; }
    else { img.loading = "lazy"; }
    pic.appendChild(img);
    return pic;
  }

  function renderKarty() {
    lista.innerHTML = "";
    lista.classList.add("pary-grid");
    dane.couples.forEach(c => {
      const odblokowana = !!lsGet(LS(c.slug));
      const card = el("button", "couple-card" + (odblokowana ? " is-unlocked" : ""));
      card.type = "button";
      card.dataset.slug = c.slug;
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
      card.addEventListener("click", () => wejdz(c.slug));
      lista.appendChild(card);
    });
  }

  /* ---- Krypto ------------------------------------------------------------ */
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

  /* ---- Deep-link (?para=<slug>#foto-N) ----------------------------------- */
  const czytajFotoHash = () => { const m = /^#foto-(\d+)$/.exec(location.hash || ""); return m ? parseInt(m[1], 10) : null; };
  let pendingFoto = czytajFotoHash();                         // kadr do otwarcia po odszyfrowaniu galerii
  const zapiszAdres = (adres) => { try { history.replaceState(null, "", adres); } catch { /* file:// itp. */ } };

  /* ---- Brama hasła ------------------------------------------------------- */
  const brama = $("#brama"), bramaForm = $("#brama-form"), bramaHaslo = $("#brama-haslo"),
        bramaBlad = $("#brama-blad"), bramaTytul = $("#brama-tytul"), bramaSubmit = $("#brama-submit");
  const bramaStrefa = $("#brama-strefa"), bramaStrefaOpis = $("#brama-strefa-opis"), bramaStrefaGrid = $("#brama-strefa-grid");
  let bramaSlug = null, ostatniFokus = null;

  function otworzBrame(slug) {
    bramaSlug = slug;
    bramaTytul.textContent = bySlug[slug].name;
    bramaBlad.textContent = "";
    bramaHaslo.value = "";
    ostatniFokus = document.activeElement;
    brama.classList.add("is-open");
    brama.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    setTimeout(() => bramaHaslo.focus(), 30);
  }
  function ukryjBrame() {                                    // samo zamknięcie modala (bez decyzji o widoku pod spodem)
    brama.classList.remove("is-open");
    brama.setAttribute("aria-hidden", "true");
  }
  function zamknijBrame() {                                  // zamknięcie z inicjatywy użytkownika (X / Esc / tło)
    ukryjBrame();
    if (bramaStrefa && !bramaStrefa.hidden && widokGaleria.hidden) {  // obcy z linku zrezygnował — pokaż normalną listę
      bramaStrefa.hidden = true;
      if (paryHead) paryHead.hidden = false;
      widokLista.hidden = false;
      zapiszAdres(location.pathname);                                 // wyczyść ?para=… żeby F5 nie wracał na bramę
    }
    if (!document.querySelector(".para-galeria:not([hidden])")) document.body.classList.remove("no-scroll");
    ostatniFokus?.focus();
  }
  $("#brama-close").addEventListener("click", zamknijBrame);
  brama.addEventListener("click", e => { if (e.target === brama) zamknijBrame(); });

  bramaForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (brakCrypto) { bramaBlad.textContent = "Ta przeglądarka nie obsługuje odszyfrowania (wymagany HTTPS)."; return; }
    const c = bySlug[bramaSlug];
    const haslo = bramaHaslo.value.trim().replace(/\s+/g, " ").toUpperCase();
    if (!haslo) { bramaBlad.textContent = "Wpisz hasło."; return; }
    bramaBlad.textContent = "";
    bramaSubmit.disabled = true; bramaSubmit.textContent = "Sprawdzam…";
    try {
      const klucz = await kluczZHasla(haslo, c);
      // weryfikacja: spróbuj odszyfrować pierwszy kadr (zły klucz => wyjątek na tagu AES-GCM)
      const url0 = await odszyfrujDoURL(klucz, c.photos[0].src);
      try {
        const surowy = await crypto.subtle.exportKey("raw", klucz);
        lsSet(LS(c.slug), bajtyNaB64(surowy));
      } catch { /* eksport klucza się nie udał — trudno */ }
      ukryjBrame();
      await pokazGalerie(c, klucz, url0);
    } catch {
      bramaBlad.textContent = "Nieprawidłowe hasło. Spróbuj jeszcze raz.";
      bramaHaslo.select();
    } finally {
      bramaSubmit.disabled = false; bramaSubmit.textContent = "Otwórz galerię";
    }
  });

  /* Tło marki dla obcego, który trafił z linku bez klucza: nagłówek marki + zablokowane kafle. */
  function pokazBrameStrefa(slug) {
    const c = bySlug[slug];
    if (bramaStrefaOpis) bramaStrefaOpis.textContent =
      `Galeria „${c.name}” jest prywatna i zabezpieczona hasłem. Wpisz hasło otrzymane od Pary Młodej, aby zobaczyć zdjęcia.`;
    if (bramaStrefaGrid && !bramaStrefaGrid.childElementCount) {
      for (let i = 0; i < 8; i++) {
        const kafel = el("div", "brama-strefa__kafel",
          `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`);
        bramaStrefaGrid.appendChild(kafel);
      }
    }
    widokLista.hidden = true;
    widokGaleria.hidden = true;
    if (paryHead) paryHead.hidden = true;
    if (bramaStrefa) bramaStrefa.hidden = false;
  }

  async function wejdz(slug) {
    const c = bySlug[slug];
    const zapis = lsGet(LS(slug));
    if (!zapis) { otworzBrame(slug); return; }
    try {
      const klucz = await crypto.subtle.importKey("raw", b64naBajty(zapis), { name: "AES-GCM" }, false, ["decrypt"]);
      // importKey NIE rzuca dla nieświeżego klucza — trzeba go zweryfikować odszyfrowaniem pierwszego kadru
      const url0 = await odszyfrujDoURL(klucz, c.photos[0].src);
      await pokazGalerie(c, klucz, url0);
    } catch {
      lsDel(LS(slug));   // zapamiętany klucz nie pasuje — poproś o hasło
      otworzBrame(slug);
    }
  }

  // Wejście z deep-linku: z kluczem -> prosto do galerii; bez klucza -> brama marki + prośba o hasło.
  function wejdzZLinku(slug) {
    if (lsGet(LS(slug))) { wejdz(slug); }
    else { pokazBrameStrefa(slug); otworzBrame(slug); }
  }

  /* ---- Galeria wybranej pary -------------------------------------------- */
  const widokLista = $("#pary-lista");
  const widokGaleria = $("#para-galeria");
  const gridPary = $("#gallery-pary");
  const tytulPary = $("#para-tytul");
  const heroMedia = $("#para-hero-media");
  let VIEW = [];        // {url,width,height} — kolejność lightboxa
  let aktywneURLe = []; // do zwolnienia
  let slugBiezacy = null;

  function sprzatnijURLe() { aktywneURLe.forEach(URL.revokeObjectURL); aktywneURLe = []; }

  /* Masonry: policz row-span z realnej wysokości odszyfrowanego kadru (jak w galerii ślubnej). */
  function packMasonry() {
    if (!gridPary || gridPary.hidden) return;
    const cs = getComputedStyle(gridPary);
    const row = parseFloat(cs.gridAutoRows) || 6;
    const gap = parseFloat(cs.rowGap) || 0;
    gridPary.querySelectorAll(".p-tile").forEach(t => {
      const img = t.querySelector("img");
      const h = img ? img.getBoundingClientRect().height : 0;
      if (h > 0) t.style.gridRowEnd = `span ${Math.ceil((h + gap) / (row + gap))}`;
    });
  }
  const debounce = (fn, ms) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };
  const repack = debounce(packMasonry, 60);
  if ("ResizeObserver" in window && gridPary) new ResizeObserver(repack).observe(gridPary);
  else addEventListener("resize", repack);

  async function pokazGalerie(c, klucz, url0) {
    sprzatnijURLe();
    slugBiezacy = c.slug;
    tytulPary.textContent = c.name;

    // HERO: teaser (jawny) natychmiast jako zaślepka; jeśli manifest wskaże `hero` — odszyfruj i podmień.
    if (heroMedia) {
      heroMedia.innerHTML = "";
      heroMedia.appendChild(teaserPicture(c.teaser, true));
      if (Number.isInteger(c.hero) && c.photos[c.hero]) {
        odszyfrujDoURL(klucz, c.photos[c.hero].src).then(u => {
          if (slugBiezacy !== c.slug) { URL.revokeObjectURL(u); return; }   // wyszliśmy z galerii zanim hero się odszyfrował — nie zostawiaj blobu
          aktywneURLe.push(u);
          const im = el("img", "para-hero__decrypted");
          im.alt = ""; im.decoding = "async";
          im.addEventListener("load", () => im.classList.add("ready"), { once: true });
          im.src = u;
          heroMedia.appendChild(im);
        }).catch(() => { /* trudno — zostaje teaser */ });
      }
    }

    gridPary.innerHTML = "";
    VIEW = [];
    if (bramaStrefa) bramaStrefa.hidden = true;
    if (paryHead) paryHead.hidden = true;
    widokLista.hidden = true;
    widokGaleria.hidden = false;
    document.body.classList.remove("no-scroll");
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });

    for (let i = 0; i < c.photos.length; i++) {
      const p = c.photos[i];
      let url;
      try { url = (i === 0 && url0) ? url0 : await odszyfrujDoURL(klucz, p.src); }
      catch { continue; }
      aktywneURLe.push(url);
      const idx = VIEW.length;
      VIEW.push({ url, width: p.width, height: p.height });
      const tile = el("button", "p-tile");
      tile.type = "button";
      tile.style.setProperty("--ar", `${p.width}/${p.height}`);   // natywna proporcja — bez przycinania
      tile.setAttribute("aria-label", `Powiększ zdjęcie ${idx + 1}`);
      const img = el("img");
      img.src = url; img.alt = ""; img.loading = "lazy"; img.decoding = "async";
      img.addEventListener("load", () => { tile.classList.add("is-loaded"); repack(); }, { once: true });
      if (img.complete) tile.classList.add("is-loaded");   // bufor: gdyby load zdążył przed podpięciem (obraz nie zniknie)
      tile.appendChild(img);
      tile.addEventListener("click", () => openLightbox(idx));
      gridPary.appendChild(tile);
    }
    if (VIEW.length === 0) {
      // żaden kadr się nie odszyfrował (np. nieświeży klucz) — nie pokazuj pustej galerii,
      // tylko wyczyść klucz i poproś o hasło, żeby użytkownik sam się odblokował
      lsDel(LS(c.slug));
      widokGaleria.hidden = true;
      widokLista.hidden = false;
      otworzBrame(c.slug);
      return;
    }
    requestAnimationFrame(packMasonry);
    zapiszAdres(`${location.pathname}?para=${encodeURIComponent(c.slug)}`);

    // deep-link: po zbudowaniu galerii otwórz wskazany kadr (VIEW gotowe — wołaj wprost, bez rAF)
    if (pendingFoto != null) {
      const t = pendingFoto; pendingFoto = null;
      if (t >= 1 && t <= VIEW.length) { openLightbox(t - 1); return; }
    }
    // brak deep-linku do kadru — przenieś fokus na sterowanie galerii (a11y: nie gub kontekstu na <body>)
    $("#wroc-do-par")?.focus({ preventScroll: true });
  }

  function wrocDoPar() {
    widokGaleria.hidden = true;
    if (bramaStrefa) bramaStrefa.hidden = true;
    if (paryHead) paryHead.hidden = false;
    widokLista.hidden = false;
    sprzatnijURLe();
    gridPary.innerHTML = "";
    slugBiezacy = null;
    zapiszAdres(location.pathname);
    renderKarty();               // odśwież stany „odblokowana”
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }
  $("#wroc-do-par").addEventListener("click", wrocDoPar);
  $("#zablokuj").addEventListener("click", () => {
    if (slugBiezacy) lsDel(LS(slugBiezacy));
    wrocDoPar();
  });

  /* ---- Lightbox (jak w galerii głównej, ale na blob-URLach) -------------- */
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
    if (slugBiezacy) zapiszAdres(`${location.pathname}?para=${encodeURIComponent(slugBiezacy)}#foto-${current + 1}`);
  }
  function closeLightbox() {
    lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    if (slugBiezacy) zapiszAdres(`${location.pathname}?para=${encodeURIComponent(slugBiezacy)}`);
    lbFokus?.focus();
  }
  // proste zamknięcie fokusu w otwartym modalu (Tab / Shift+Tab nie ucieka poza dialog)
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
    if (lb.classList.contains("is-open")) {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Tab") trapFocus(lb, e);
    } else if (brama.classList.contains("is-open")) {
      if (e.key === "Escape") zamknijBrame();
      else if (e.key === "Tab") trapFocus(brama.querySelector(".brama__panel"), e);
    }
  });
  let x0 = null;
  lbStage.addEventListener("touchstart", e => { x0 = e.changedTouches[0].clientX; }, { passive: true });
  lbStage.addEventListener("touchend", e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 45) (dx < 0 ? next() : prev());
    x0 = null;
  }, { passive: true });

  /* ---- Udostępnianie / zapis / link -------------------------------------- */
  const toastEl = $("#lb-toast");
  let toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    void toastEl.offsetWidth;                 // wymuś reflow, by przejście zadziałało bez zależności od rAF
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("is-show");
      setTimeout(() => { toastEl.hidden = true; }, 300);
    }, 2400);
  }

  function zaladujObraz(url) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;                 // blob-URL = to samo źródło => canvas nieskażony
    });
  }
  function rysujPodpis(ctx, W, H) {
    const fs = Math.max(15, Math.round(W * 0.018));
    ctx.font = `500 ${fs}px "Jost", "Segoe UI", system-ui, sans-serif`;
    ctx.textBaseline = "alphabetic";
    const pad = Math.round(fs * 0.95);
    const tw = ctx.measureText(PODPIS).width;
    const x = W - pad - tw;
    const y = H - pad;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = Math.round(fs * 0.5);
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = "rgba(255,255,255,.86)";
    ctx.fillText(PODPIS, x, y);
    ctx.restore();
  }
  async function plikZPodpisem(it) {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch { /* nieistotne */ } }
    const img = await zaladujObraz(it.url);
    const W = img.naturalWidth || it.width, H = img.naturalHeight || it.height;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, W, H);
    rysujPodpis(ctx, W, H);
    const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.92));
    if (!blob) throw new Error("toBlob null");
    const nazwa = `msfoto-${slugBiezacy || "galeria"}-${String(current + 1).padStart(2, "0")}.jpg`;
    return new File([blob], nazwa, { type: "image/jpeg" });
  }
  function pobierzPlik(file) {
    const url = URL.createObjectURL(file);
    const a = el("a"); a.href = url; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);   // natychmiastowy revoke bywa anuluje pobieranie
  }
  async function udostepnijBiezace() {
    if (!VIEW.length) return;
    let file;
    try { file = await plikZPodpisem(VIEW[current]); }
    catch { toast("Nie udało się przygotować zdjęcia"); return; }
    const data = { files: [file], title: tytulPary.textContent || "Galeria", text: UDOSTEP_TEXT };
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share(data); return; }
      catch (err) { if (err && err.name === "AbortError") return; /* inny błąd → fallback na pobranie */ }
    }
    pobierzPlik(file);
    toast("Zapisano zdjęcie z podpisem");
  }
  function linkDoBiezacego() {
    return `${location.origin}${location.pathname}?para=${encodeURIComponent(slugBiezacy || "")}#foto-${current + 1}`;
  }
  async function kopiujLink() {
    if (!slugBiezacy) return;
    const link = linkDoBiezacego();
    try {
      await navigator.clipboard.writeText(link);
      toast("Skopiowano link do zdjęcia");
    } catch {
      // fallback bez Clipboard API (np. brak uprawnień)
      const ta = el("textarea"); ta.value = link; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
      toast(ok ? "Skopiowano link do zdjęcia" : "Skopiuj link z paska adresu");
    }
  }
  $("#lb-share")?.addEventListener("click", udostepnijBiezace);
  $("#lb-link")?.addEventListener("click", kopiujLink);

  /* ---- Start ------------------------------------------------------------- */
  renderKarty();

  // Wejście z deep-linku (?para=<slug>): prowadź na bramę/galerię wskazanej pary.
  const params = new URLSearchParams(location.search);
  const deepSlug = params.get("para");
  if (deepSlug && bySlug[deepSlug]) wejdzZLinku(deepSlug);
})();
