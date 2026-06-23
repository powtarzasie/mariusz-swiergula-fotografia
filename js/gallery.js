/* ============================================================================
   Galeria kuratorska — render z manifestu (data/gallery.json):
   siatka editorialowa (masonry) + lekkie filtry + lightbox z klawiaturą i swipe.
   Strona deklaruje: <div id="gallery" data-section="weddings|family"></div>
   ========================================================================== */
(() => {
  const root = document.getElementById("gallery");
  if (!root) return;
  const SECTION = root.dataset.section;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let ITEMS = [];          // wszystkie z sekcji
  let VIEW = [];           // aktualnie widoczne (po filtrze) — kolejność lightboxa
  let current = 0;
  let lastFocus = null;

  const $ = (s, c = document) => c.querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };

  /* ---- <picture> builder -------------------------------------------------- */
  function picture(item, { sizes, lightbox = false }) {
    const f = item.formats, b = item.base;
    const sized = lightbox
      ? [["full", item.px.full], ["desktop", item.px.desktop]]
      : [["mobile", item.px.mobile], ["desktop", item.px.desktop]];
    const srcset = ext => sized.map(([n, w]) => `${b}-${n}.${ext} ${w}w`).join(", ");
    const pic = el("picture");
    f.filter(x => x !== "jpg").forEach(ext => {
      const s = el("source");
      s.type = ext === "avif" ? "image/avif" : "image/webp";
      s.srcset = srcset(ext); s.sizes = sizes;
      pic.appendChild(s);
    });
    const img = el("img");
    img.src = `${b}-${lightbox ? "desktop" : "mobile"}.jpg`;
    img.srcset = srcset("jpg"); img.sizes = sizes;
    img.width = item.width; img.height = item.height;
    img.alt = item.alt;
    img.loading = lightbox ? "eager" : "lazy";
    img.decoding = "async";
    pic.appendChild(img);
    return { pic, img };
  }

  /* ---- Render siatki ------------------------------------------------------ */
  function renderGrid() {
    const grid = el("div", "gallery-grid");
    grid.setAttribute("role", "list");
    ITEMS.forEach((item, i) => {
      const feature = item.span === "big" || item.span === "wide";
      const a = el("a", "tile" + (feature ? " span-2" : ""));
      a.href = item.src.full;
      a.style.setProperty("--ar", `${item.width}/${item.height}`);
      a.setAttribute("role", "listitem");
      a.setAttribute("aria-label", `Powiększ: ${item.caption || item.alt}`);
      a.dataset.tags = item.tags.join(" ");
      a.dataset.index = i;
      const { pic } = picture(item, { sizes: feature
        ? "(min-width:1100px) 50vw, (min-width:720px) 66vw, 100vw"
        : "(min-width:1100px) 25vw, (min-width:720px) 33vw, 50vw" });
      pic.querySelector("img").style.aspectRatio = "var(--ar)";
      a.appendChild(pic);
      if (item.caption) a.appendChild(el("span", "tile__cap", item.caption));
      a.addEventListener("click", e => { e.preventDefault(); openLightbox(+a.dataset.index); });
      grid.appendChild(a);
    });
    root.innerHTML = "";
    root.appendChild(grid);
    return grid;
  }

  /* ---- Masonry: licz row-span z realnej wysokości ------------------------- */
  let GRID;
  function packMasonry() {
    if (!GRID) return;
    const cs = getComputedStyle(GRID);
    const row = parseFloat(cs.gridAutoRows) || 6;
    const gap = parseFloat(cs.rowGap) || 0;
    GRID.querySelectorAll(".tile").forEach(t => {
      if (t.classList.contains("is-hidden")) return;
      // mierzymy wysokość TREŚCI (zdjęcia), nie kafelka rozciągniętego przez tor siatki
      const inner = t.querySelector("picture") || t.firstElementChild;
      const h = inner ? inner.getBoundingClientRect().height : 0;
      if (h > 0) t.style.gridRowEnd = `span ${Math.ceil((h + gap) / (row + gap))}`;
    });
  }
  const debounce = (fn, ms) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };

  /* ---- Lightbox ----------------------------------------------------------- */
  const lb = $("#lightbox");
  const lbStage = $("#lb-stage");
  const lbCount = $("#lb-count");
  const lbThumbs = $("#lb-thumbs");

  function buildThumbs() {
    if (!lbThumbs) return;
    lbThumbs.innerHTML = "";
    VIEW.forEach((item, i) => {
      const im = el("img");
      im.src = `${item.base}-mobile.jpg`; im.alt = ""; im.loading = "lazy";
      im.dataset.i = i;
      im.addEventListener("click", () => show(i));
      lbThumbs.appendChild(im);
    });
  }

  function openLightbox(globalIndex) {
    const item = ITEMS[globalIndex];
    if (VIEW.length === 0) VIEW = ITEMS.slice();
    current = VIEW.indexOf(item);
    if (current < 0) current = 0;
    lastFocus = document.activeElement;
    buildThumbs();
    lb.classList.add("is-open");
    lb.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    show(current);
    $("#lb-close").focus();
  }

  function show(i) {
    current = (i + VIEW.length) % VIEW.length;
    const item = VIEW[current];
    const fig = $("#lb-fig");
    fig.querySelector(".lb__img-wrap")?.remove();
    const wrap = el("div", "lb__img-wrap");
    const { pic, img } = picture(item, { sizes: "100vw", lightbox: true });
    img.classList.add("lb__img");
    img.alt = item.alt;
    img.addEventListener("load", () => img.classList.add("ready"), { once: true });
    if (img.complete) img.classList.add("ready");
    wrap.appendChild(pic);
    fig.prepend(wrap);
    const cap = $("#lb-cap");
    cap.textContent = item.caption || "";
    cap.style.display = item.caption ? "" : "none";
    lbCount.innerHTML = `<b>${String(current + 1).padStart(2, "0")}</b> / ${String(VIEW.length).padStart(2, "0")}`;
    if (lbThumbs) {
      lbThumbs.querySelectorAll("img").forEach(t => t.classList.toggle("is-current", +t.dataset.i === current));
      lbThumbs.querySelector(".is-current")?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
    }
  }

  function closeLightbox() {
    lb.classList.remove("is-open");
    lb.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    lastFocus?.focus();
  }
  const next = () => show(current + 1);
  const prev = () => show(current - 1);

  function bindLightbox() {
    $("#lb-close").addEventListener("click", closeLightbox);
    $("#lb-next").addEventListener("click", next);
    $("#lb-prev").addEventListener("click", prev);
    lb.addEventListener("click", e => { if (e.target === lb || e.target === lbStage) closeLightbox(); });
    document.addEventListener("keydown", e => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Tab") {                 // prosty focus-trap
        const f = lb.querySelectorAll("button");
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // swipe
    let x0 = null;
    lbStage.addEventListener("touchstart", e => { x0 = e.changedTouches[0].clientX; }, { passive: true });
    lbStage.addEventListener("touchend", e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) (dx < 0 ? next() : prev());
      x0 = null;
    }, { passive: true });
  }

  /* ---- Reveal (stagger) --------------------------------------------------- */
  function revealTiles() {
    const tiles = [...GRID.querySelectorAll(".tile")];
    if (reduce || !("IntersectionObserver" in window)) { tiles.forEach(t => t.classList.add("in")); return; }
    const io = new IntersectionObserver((ents, obs) => {
      ents.forEach(ent => {
        if (ent.isIntersecting) {
          const t = ent.target;
          t.style.transitionDelay = `${Math.min(([...GRID.children].indexOf(t) % 4) * 0.05, .2)}s`;
          t.classList.add("in"); obs.unobserve(t);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    tiles.forEach(t => io.observe(t));
  }

  /* ---- Init --------------------------------------------------------------- */
  async function init() {
    try {
      // Preferuj wbudowany manifest (window.GALLERY z data/gallery.js) — działa też na file://.
      let data = window.GALLERY;
      if (!data) {
        const res = await fetch("data/gallery.json", { cache: "no-cache" });
        data = await res.json();
      }
      const heroId = root.dataset.hero || "";   // kadr-okładka nie powtarza się w siatce
      ITEMS = data.items.filter(i => i.section === SECTION && i.id !== heroId);
    } catch (err) {
      root.innerHTML = `<p class="g-empty">Nie udało się wczytać galerii. Odśwież stronę.</p>`;
      console.error(err); return;
    }
    if (!ITEMS.length) { root.innerHTML = `<p class="g-empty">Wkrótce nowe kadry.</p>`; return; }
    document.querySelectorAll("[data-count]").forEach(n => n.textContent = String(ITEMS.length).padStart(2, "0"));
    GRID = renderGrid();
    VIEW = ITEMS.slice();
    bindLightbox();
    revealTiles();

    const repack = debounce(packMasonry, 80);
    // ResizeObserver odpala się, gdy siatka dostanie realną szerokość (pierwszy layout)
    // oraz przy każdej zmianie rozmiaru — niezależnie od momentu wczytania manifestu.
    if ("ResizeObserver" in window) new ResizeObserver(repack).observe(root);
    else addEventListener("resize", repack);
    requestAnimationFrame(packMasonry);
    addEventListener("load", () => requestAnimationFrame(packMasonry));
    // dodatkowy pack po doczytaniu każdego zdjęcia (różne czasy ładowania)
    GRID.querySelectorAll("img").forEach(img => {
      if (!img.complete) img.addEventListener("load", repack, { once: true });
    });
  }
  init();
})();
