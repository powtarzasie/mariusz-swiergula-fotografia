/* ============================================================================
   Nawigacja, menu mobilne, reveal sekcji (poza galerią).
   ========================================================================== */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* nav: stan „solid" po przewinięciu */
  const nav = document.querySelector(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-solid", window.scrollY > 40);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
  }

  /* menu mobilne */
  const toggle = document.querySelector(".nav__toggle");
  const menu = document.querySelector("#menu");
  if (toggle && menu) {
    const close = document.querySelector(".menu__close");
    const open = (state) => {
      menu.classList.toggle("is-open", state);
      menu.setAttribute("aria-hidden", state ? "false" : "true");
      toggle.setAttribute("aria-expanded", state ? "true" : "false");
      document.body.classList.toggle("no-scroll", state);
      if (state) menu.querySelector("a")?.focus();
    };
    toggle.addEventListener("click", () => open(true));
    close?.addEventListener("click", () => open(false));
    menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => open(false)));
    addEventListener("keydown", e => { if (e.key === "Escape" && menu.classList.contains("is-open")) open(false); });
  }

  /* reveal sekcji */
  const revs = document.querySelectorAll(".reveal");
  if (revs.length) {
    if (reduce || !("IntersectionObserver" in window)) {
      revs.forEach(r => r.classList.add("in"));
    } else {
      const io = new IntersectionObserver((ents, obs) => {
        ents.forEach(ent => { if (ent.isIntersecting) { ent.target.classList.add("in"); obs.unobserve(ent.target); } });
      }, { rootMargin: "0px 0px -10% 0px" });
      revs.forEach(r => io.observe(r));
    }
  }

  /* stagger: kaskadowe wejście dzieci kontenera [data-stagger] */
  const groups = document.querySelectorAll("[data-stagger]");
  groups.forEach(group => {
    const items = [...group.children];
    items.forEach(i => i.classList.add("st-item"));
    if (reduce || !("IntersectionObserver" in window)) { items.forEach(i => i.classList.add("in")); return; }
    const io = new IntersectionObserver((ents, obs) => {
      ents.forEach(ent => {
        if (!ent.isIntersecting) return;
        items.forEach((it, idx) => { it.style.transitionDelay = `${Math.min(idx * 0.07, 0.45)}s`; it.classList.add("in"); });
        obs.unobserve(ent.target);
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(group);
  });

  /* rok w stopce */
  document.querySelectorAll("[data-year]").forEach(n => n.textContent = new Date().getFullYear());
})();
