/* ============================================================================
   SILNIK ALBUMU (wspólny dla koncepcji A/B/C).
   - MOTYWY: akcent tematyczny sesji (kolor + animacja tła). Zmiana motywu
     = jedna linijka w historia.js, układ zostaje.
   - Czastki: lekka animacja w <canvas> (liście, śnieg, płatki, bokeh).
     Szanuje „ogranicz ruch" w systemie, zatrzymuje się w ukrytej karcie.
   - Zegar historii: zdarzenie "album:czas" z godziną kadru, który jest na ekranie.
   - Przeglądarka zdjęć (lightbox): klik, strzałki, Esc, przesunięcie palcem, Zapisz, pokaz slajdów.
   ========================================================================== */
(() => {
  const H = window.HISTORIA, W = window.WYMIARY;
  const ruchOgr = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const MOTYWY = {
    jesien: { nazwa: "Złota jesień", akcent: "#C98A3B", ton: "#F4F0E9", akcentJ: "#9A6A33", czastki: "liscie",
      kolory: ["#C98A3B", "#B4652A", "#D9A441", "#8C5A2B", "#A39A3A"] },
    zima:   { nazwa: "Zima", akcent: "#A9BFD2", ton: "#F2F3F4", akcentJ: "#5E7487", czastki: "snieg",
      kolory: ["#FFFFFF", "#E4ECF3", "#CFDCE8"] },
    wiosna: { nazwa: "Wiosna / ślub w ogrodzie", akcent: "#D6A1A7", ton: "#F5F1EF", akcentJ: "#9A5F67", czastki: "platki",
      kolory: ["#F4D9DC", "#FFF3F1", "#E6B5BC", "#F8E7DA"] },
    lato:   { nazwa: "Lato / złota godzina", akcent: "#D8B26A", ton: "#F5F1E8", akcentJ: "#8F6F2E", czastki: "bokeh",
      kolory: ["#FFD58A", "#FFE9BE", "#F3B46B"] },
    brak:   { nazwa: "Bez akcentu", akcent: "#C2A66B", ton: "#F3F2EF", akcentJ: "#7A6A4A", czastki: null, kolory: [] }
  };

  /* ---------- pomocnicze ---------- */
  /* srcset: telefon bierze 640/1080 px (warianty-zdjec.py), komputer 1600/2000; sizes mówi, jak szeroki jest kadr */
  const srcset = id => { const w = (W[id] || [2000])[0];
    return [640, 1080, 1600].filter(x => x < w).map(x => `img/w${x}/${id}.jpg ${x}w`).concat(`img/${id}.jpg ${w}w`).join(", "); };
  const foto = (id, { cls = "", alt = "", lazy = true, sizes = "100vw" } = {}) => {
    const [w, h, t] = W[id] || [3, 2, ""];
    return `<img class="foto ${cls}" src="img/w1080/${id}.jpg" srcset="${srcset(id)}" sizes="${sizes}" width="${w}" height="${h}" data-t="${t}" data-id="${id}"
      alt="${alt || `Kadr z godziny ${t}`}" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async">`;
  };
  const proporcja = id => { const [w, h] = W[id] || [3, 2]; return w / h; };
  /* rząd zdjęć o równej wysokości: flex-grow = proporcja kadru (zero kadrowania) */
  const rzad = (ids, cls = "") => `<div class="rzad ${cls}">${ids.map(id =>
      `<figure style="flex:${proporcja(id)} 1 0">${foto(id)}</figure>`).join("")}</div>`;

  /* ---------- czastki ---------- */
  let cz = null;
  function startCzastki(canvas, motyw, opcje = {}) {
    if (cz) cz.stop();
    if (!motyw.czastki || !canvas) { canvas && (canvas.style.opacity = 0); return; }
    canvas.style.opacity = "";
    const ctx = canvas.getContext("2d"), dpr = Math.min(devicePixelRatio || 1, 1.5);
    const gest = opcje.gestosc ?? 1;
    let Wd, Hd, P = [], raf, tik = 0, dziala = true;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const nowa = (start) => {
      const z = rnd(.35, 1);                       // głębia: dalsze mniejsze, wolniejsze, bledsze
      const typ = motyw.czastki;
      return {
        x: rnd(0, Wd), y: start ? rnd(-Hd, Hd) : rnd(-80, -20), z,
        s: typ === "bokeh" ? rnd(18, 60) * z : typ === "snieg" ? rnd(1.2, 3.4) * z : rnd(7, 15) * z,
        vy: (typ === "bokeh" ? -rnd(.08, .22) : rnd(.35, .9)) * z,
        vx: rnd(-.15, .25), ph: rnd(0, 6.28), fr: rnd(.006, .016),
        r: rnd(0, 6.28), vr: rnd(-.02, .02), flip: rnd(0, 6.28), vf: rnd(.01, .04),
        c: motyw.kolory[(Math.random() * motyw.kolory.length) | 0],
        a: (typ === "bokeh" ? rnd(.06, .16) : rnd(.35, .85)) * (.45 + .55 * z)
      };
    };
    const rozmiar = () => {
      Wd = canvas.clientWidth; Hd = canvas.clientHeight;
      canvas.width = Wd * dpr; canvas.height = Hd * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ile = Math.round(Math.min(60, (Wd * Hd) / (motyw.czastki === "snieg" ? 9000 : 26000)) * gest);
      P = Array.from({ length: ile }, () => nowa(true));
      if (motyw.czastki === "bokeh") P.forEach(p => p.y = rnd(0, Hd));
    };
    const lisc = p => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(Math.cos(p.flip), 1);
      ctx.globalAlpha = p.a; ctx.fillStyle = p.c; const s = p.s;
      ctx.beginPath(); ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * .9, -s * .45, s * .7, s * .55, 0, s);
      ctx.bezierCurveTo(-s * .7, s * .55, -s * .9, -s * .45, 0, -s); ctx.fill();
      ctx.globalAlpha = p.a * .5; ctx.strokeStyle = "rgba(40,20,5,.6)"; ctx.lineWidth = .6;
      ctx.beginPath(); ctx.moveTo(0, -s * .9); ctx.lineTo(0, s * 1.25); ctx.stroke(); ctx.restore();
    };
    const platek = p => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(Math.cos(p.flip), 1);
      ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.beginPath();
      ctx.ellipse(0, 0, p.s * .55, p.s * .8, 0, 0, 6.28); ctx.fill(); ctx.restore();
    };
    const kropka = p => { ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill(); };
    const bokeh = p => {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
      g.addColorStop(0, p.c); g.addColorStop(1, "transparent");
      ctx.globalAlpha = p.a * (.75 + .25 * Math.sin(tik * .02 + p.ph)); ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill();
    };
    const rysuj = { liscie: lisc, platki: platek, snieg: kropka, bokeh }[motyw.czastki];
    const klatka = () => {
      if (!dziala) return; tik++;
      ctx.clearRect(0, 0, Wd, Hd);
      for (const p of P) {
        p.y += p.vy; p.x += p.vx + Math.sin(tik * p.fr + p.ph) * (motyw.czastki === "bokeh" ? .15 : .6) * p.z;
        p.r += p.vr; p.flip += p.vf;
        if (p.y > Hd + 40 || p.y < -90 || p.x < -60 || p.x > Wd + 60) Object.assign(p, nowa(false), motyw.czastki === "bokeh" ? { y: Hd + 50 } : {});
        rysuj(p);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(klatka);
    };
    rozmiar(); addEventListener("resize", rozmiar);
    if (ruchOgr) { klatka(); dziala = false; cancelAnimationFrame(raf); }   // jedna nieruchoma klatka
    else raf = requestAnimationFrame(klatka);
    const widocz = () => { if (ruchOgr) return; if (document.hidden) { dziala = false; cancelAnimationFrame(raf); } else if (!dziala) { dziala = true; raf = requestAnimationFrame(klatka); } };
    document.addEventListener("visibilitychange", widocz);
    cz = { stop() { dziala = false; cancelAnimationFrame(raf); removeEventListener("resize", rozmiar); document.removeEventListener("visibilitychange", widocz); ctx.clearRect(0, 0, Wd, Hd); } };
    return cz;
  }

  /* ---------- motyw ---------- */
  let canvasRef = null, opcjeRef = {};
  function ustawMotyw(klucz) {
    const m = MOTYWY[klucz] || MOTYWY.brak;
    document.documentElement.style.setProperty("--akcent", m.akcent);
    document.documentElement.style.setProperty("--ton", m.ton);          // barwa jasnego tła (wersje v2)
    document.documentElement.style.setProperty("--akcent-j", m.akcentJ); // akcent czytelny na jasnym tle
    document.documentElement.dataset.motyw = klucz;
    startCzastki(canvasRef, m, opcjeRef);
    document.querySelectorAll("[data-motyw-btn]").forEach(b => b.setAttribute("aria-pressed", b.dataset.motywBtn === klucz));
  }

  /* panel podglądu motywów: narzędzie makiety, w wersji dla pary go nie ma */
  function panelMotywow() {
    const el = document.createElement("div");
    el.className = "motyw-panel";
    el.innerHTML = `<span class="motyw-panel__lbl">Akcent sesji</span>` +
      Object.entries(MOTYWY).map(([k, m]) => `<button type="button" data-motyw-btn="${k}" aria-pressed="false" title="${m.nazwa}">
        <i style="background:${m.akcent}"></i><span>${m.nazwa.split(" /")[0]}</span></button>`).join("");
    document.body.appendChild(el);
    el.addEventListener("click", e => { const b = e.target.closest("[data-motyw-btn]"); if (b) ustawMotyw(b.dataset.motywBtn); });
  }

  /* ---------- zegar historii ---------- */
  function zegar() {
    const io = new IntersectionObserver(wpisy => {
      for (const w of wpisy) if (w.isIntersecting) {
        const el = w.target;
        document.dispatchEvent(new CustomEvent("album:czas", { detail: {
          czas: el.dataset.t, rozdzial: +(el.closest("[data-rozdzial]")?.dataset.rozdzial ?? -1), el } }));
      }
    }, { rootMargin: "-45% 0px -45% 0px" });
    document.querySelectorAll("[data-t]:not([data-t=''])").forEach(e => io.observe(e));
  }

  /* ---------- pojawianie się ---------- */
  function wejscia() {
    const io = new IntersectionObserver(wpisy => wpisy.forEach(w => {
      if (w.isIntersecting) { w.target.classList.add("is-in"); io.unobserve(w.target); }
    }), { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    document.querySelectorAll(".fx").forEach(e => io.observe(e));
  }

  /* ---------- lightbox + pokaz slajdów ---------- */
  /* Pokaz: pełny ekran (gdzie przeglądarka pozwala; iPhone nie daje pełnego ekranu dla zdjęć, wtedy
     podgląd i tak zajmuje cały widok), kolejne kadry co H.pokazSek s (domyślnie 5) z przenikaniem,
     pasek postępu, przyciski chowają się w trakcie, ekran nie gaśnie (Wake Lock), stop na ostatnim. */
  let pokazSlajdow = () => {};
  function lightbox() {
    const lb = document.createElement("div");
    lb.className = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Podgląd zdjęcia"); lb.hidden = true;
    lb.innerHTML = `<img class="lb__img" alt="">
      <span class="lb__pasek" aria-hidden="true"></span>
      <button class="lb__btn lb__zamknij" type="button" aria-label="Zamknij podgląd">Zamknij</button>
      <button class="lb__btn lb__zapisz" type="button">Zapisz</button>
      <button class="lb__btn lb__pokaz" type="button" aria-pressed="false">Pokaz slajdów</button>
      <button class="lb__btn lb__wstecz" type="button" aria-label="Poprzednie zdjęcie"><span class="arrow" style="transform:scaleX(-1)"></span></button>
      <button class="lb__btn lb__dalej" type="button" aria-label="Następne zdjęcie"><span class="arrow"></span></button>
      <div class="lb__meta"><span class="lb__nr"></span><span class="lb__t"></span></div>`;
    document.body.appendChild(lb);
    const img = lb.querySelector(".lb__img"), pasek = lb.querySelector(".lb__pasek"), btnPokaz = lb.querySelector(".lb__pokaz");
    const SEK = (H.pokazSek || 5) * 1000;
    lb.style.setProperty("--sek", SEK / 1000 + "s");
    let lista = [], i = 0, ostatni = null, gra = false, timer = null, cisza = null, blokada = null;
    const wszystkie = () => [...document.querySelectorAll("img.foto")].filter(f => !f.closest(".okl"));

    const wstepnie = n => { const s = lista[n]; if (!s) return; const p = new Image(); p.sizes = "100vw"; p.srcset = s.srcset; p.src = s.src; };
    const idz = (n, plynnie = false) => {
      i = (n + lista.length) % lista.length; const s = lista[i];
      const ustaw = () => {
        img.sizes = "100vw"; img.srcset = s.srcset; img.src = s.src; img.alt = s.alt;   // przeglądarka sama dobiera większy plik
        lb.querySelector(".lb__nr").textContent = `${String(i + 1).padStart(2, "0")} / ${lista.length}`;
        lb.querySelector(".lb__t").textContent = s.dataset.t;
      };
      if (plynnie && !ruchOgr) {
        img.classList.add("znika");
        setTimeout(() => { ustaw(); (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).finally(() => img.classList.remove("znika")); }, 380);
      } else ustaw();
      wstepnie(i + 1);
      if (gra) planuj();
    };
    const planuj = () => {
      clearTimeout(timer);
      pasek.classList.remove("biegnie"); void pasek.offsetWidth; pasek.classList.add("biegnie");   // restart paska
      timer = setTimeout(() => { if (i >= lista.length - 1) { stop(); return; } idz(i + 1, true); }, SEK);
    };
    const pokazUI = () => {
      lb.classList.remove("lb--cisza"); clearTimeout(cisza);
      if (gra) cisza = setTimeout(() => lb.classList.add("lb--cisza"), 2500);
    };
    const zablokujEkran = async () => { try { blokada = await navigator.wakeLock?.request("screen"); } catch { blokada = null; } };
    const start = () => {
      gra = true; lb.classList.add("lb--gra"); btnPokaz.textContent = "Pauza"; btnPokaz.setAttribute("aria-pressed", "true");
      planuj(); pokazUI(); zablokujEkran();
    };
    const stop = () => {
      gra = false; clearTimeout(timer); lb.classList.remove("lb--gra"); pasek.classList.remove("biegnie");
      btnPokaz.textContent = "Pokaz slajdów"; btnPokaz.setAttribute("aria-pressed", "false");
      blokada?.release?.().catch(() => {}); blokada = null; pokazUI();
    };
    const pelnyEkran = () => { if (!document.fullscreenElement && lb.requestFullscreen) lb.requestFullscreen().catch(() => {}); };

    /* okładka powtarza kadr z historii: w liczniku jej nie ma, chyba że to ją kliknięto */
    const otworz = el => { lista = wszystkie();
      if (!lista.includes(el)) lista.unshift(el); ostatni = el; idz(lista.indexOf(el)); lb.hidden = false; document.body.classList.add("no-scroll"); lb.querySelector(".lb__zamknij").focus(); };
    const zamknij = () => {
      stop(); lb.hidden = true; document.body.classList.remove("no-scroll");
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      ostatni?.focus?.();
    };
    pokazSlajdow = (od = 0) => { const l = wszystkie(); if (!l.length) return; otworz(l[Math.min(od, l.length - 1)]); pelnyEkran(); start(); };

    document.addEventListener("click", e => { const f = e.target.closest("img.foto"); if (f && !lb.contains(f)) otworz(f); });
    document.addEventListener("keydown", e => {
      const f = e.target.closest?.("img.foto"); if (f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); otworz(f); }
      if (lb.hidden) return;
      pokazUI();
      if (e.key === "Escape") zamknij();
      if (e.key === "ArrowRight") idz(i + 1, gra); if (e.key === "ArrowLeft") idz(i - 1, gra);
      /* spacja w podglądzie = pauza/wznowienie, nigdy "wciśnięcie" przycisku z fokusem (np. Zamknij) */
      if (e.key === " " && !e.target.closest?.("textarea, input")) { e.preventDefault(); gra ? stop() : start(); }
    });
    /* Esc w trybie pełnego ekranu najpierw zamyka sam pełny ekran: wtedy tylko pauza, podgląd zostaje */
    document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && gra) stop(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && gra) zablokujEkran(); });
    lb.addEventListener("pointermove", pokazUI);
    lb.querySelector(".lb__zamknij").onclick = zamknij;
    btnPokaz.onclick = () => { if (gra) stop(); else { pelnyEkran(); if (i >= lista.length - 1) idz(0); start(); } };
    /* Zapisz: telefon = systemowe „Udostępnij” (tam „Zapisz obraz” → galeria), komputer = pobranie pliku.
       Plik pełny: img/<id>.jpg (2000 px); docelowo pełna rozdzielczość z paczki sesji. */
    lb.querySelector(".lb__zapisz").onclick = async () => {
      const s = lista[i], url = `img/${s.dataset.id}.jpg`, nazwa = `${s.dataset.id}.jpg`;
      if (gra) stop();
      try {
        const plik = new File([await (await fetch(url)).blob()], nazwa, { type: "image/jpeg" });
        if (matchMedia("(pointer:coarse)").matches && navigator.canShare?.({ files: [plik] })) { await navigator.share({ files: [plik] }); return; }
        const a = document.createElement("a"); a.href = URL.createObjectURL(plik); a.download = nazwa;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      } catch (e) { if (e.name !== "AbortError") location.href = url; }   // anulowane udostępnianie to nie błąd
    };
    lb.querySelector(".lb__dalej").onclick = () => idz(i + 1, gra);
    lb.querySelector(".lb__wstecz").onclick = () => idz(i - 1, gra);
    /* dotknięcie tła: w pokazie tylko przywraca przyciski (nie zamyka), poza pokazem zamyka */
    lb.addEventListener("click", e => { if (e.target === lb || e.target === img) { if (gra || lb.classList.contains("lb--cisza")) pokazUI(); else if (e.target === lb) zamknij(); } });
    let x0 = null;
    lb.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; pokazUI(); }, { passive: true });
    lb.addEventListener("touchend", e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) idz(i + (dx < 0 ? 1 : -1), gra); x0 = null; });
  }

  /* ---------- start ---------- */
  /* v2: panel = false i bez canvas: akcent sesji to tylko barwa, bez ruchomych ozdób */
  function init({ canvas, czastki = {}, panel = true } = {}) {
    canvasRef = canvas; opcjeRef = czastki;
    document.querySelectorAll("img.foto").forEach(f => { f.tabIndex = 0; f.setAttribute("role", "button"); });
    zegar(); wejscia(); lightbox(); if (panel) panelMotywow();
    ustawMotyw(new URLSearchParams(location.search).get("motyw") || H.motyw);   // ?motyw=zima: podgląd innego akcentu
  }

  window.Album = { H, W, MOTYWY, foto, srcset, rzad, proporcja, init, ustawMotyw, ruchOgr,
    pokazSlajdow: od => pokazSlajdow(od) };
})();
