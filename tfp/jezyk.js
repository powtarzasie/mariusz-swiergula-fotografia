/* Podstrona /tfp: przełącznik PL/EN + przycisk „Wyślij parze".
   Tekst polski siedzi w HTML, angielski w słowniku EN.
   Wybór języka: ?lang=en > zapamiętany wybór > język przeglądarki (inny niż polski = EN). */
(function () {
  const EN = {
    "meta.title": "Once more · Mariusz Świerguła",
    "z.presents": "Mariusz Świerguła presents",
    "z.p.title": "Once <em>more</em>",
    "z.p.tag": "Looking for couples. Free. No posing.",
    "z.p.billing": "Starring <b>the two of you</b> · script <b>written for you</b> · cinematography <b>Mariusz Świerguła</b> · location <b>Łódź and around</b> · natural light · about 2 hours · ticket <b>free</b>",
    "z.p.soon": "Premiere: your session",
    "z.p.frames": "Stills from the set",
    "z.k1": "Couple no. 1 · Julianów Park",
    "z.k2": "Couple 4x4 · off-road track",
    "z.big1": "Free.",
    "z.big2": "2 hours.",
    "z.big3": "10+ photos.",
    "z.big4": "Zero posing.",
    "z.r.label": "House rules",
    "z.r.h1": "The session",
    "z.r.1a": "about 2 hours, outdoors or indoors, Łódź and around",
    "z.r.1b": "just the two of you, no guests or children",
    "z.r.1c": "a 15-minute call first and a script written for you",
    "z.r.1d": "bad weather or illness? we reschedule at no cost",
    "z.r.h2": "Photos",
    "z.r.2a": "I choose and edit the frames, in my own style",
    "z.r.2b": "at least 10 photos, full-resolution JPG",
    "z.r.2c": "a link within 30 days of the session, no earlier than 14 days after signing",
    "z.r.2d": "the link works for 60 days, so save your photos",
    "z.r.h3": "You",
    "z.r.3a": "use the photos privately and commercially, with no time limit",
    "z.r.3b": "always credit “ph. Mariusz Świerguła” or tag my profile",
    "z.r.3c": "cropping is fine; filters, retouching and AI are not",
    "z.r.3d": "don't sell them or give them to others to publish",
    "z.r.h4": "Me",
    "z.r.4a": "I show the photos in my portfolio, website, social media, competitions and publications",
    "z.r.4b": "paid ads and partners (e.g. the venue) only if you tick a box",
    "z.r.4c": "I don't alter faces or bodies, don't train AI, don't sell to stock sites",
    "z.r.4d": "I never publish your surnames",
    "z.r.h5": "Changing your mind",
    "z.r.5a": "14 days after signing: cancel with no reason and at no cost",
    "z.r.5b": "withdraw permission to show the photos any time by e-mail; I remove them within 14 days",
    "z.r.5c": "the photos then stay with you for home use, not published online",
    "z.r.5d": "or within the first 24 months: refund part of the session value (4,000 PLN) and keep full rights",
    "z.r.h6": "The contract",
    "z.r.6a": "3 pages, plain language",
    "z.r.6b": "each of you decides for yourself",
    "z.r.6c": "signed on the day of the session, on paper or electronically",
    "z.cta.write": "Message me",
    "z.cta.call": "Call",
    "z.cta.share": "Send to a couple who'd fit",
    "z.fine": "Written contract · 14 days to cancel · no surnames",
    "z.sign": "photography"
  };

  const DOC_TITLE_PL = document.title;
  const nodes = Array.from(document.querySelectorAll("[data-i18n]"));
  const PL = new Map(nodes.map(n => [n, n.innerHTML]));
  let current = "pl";

  function set(lang) {
    current = lang === "en" ? "en" : "pl";
    nodes.forEach(n => {
      const k = n.dataset.i18n;
      n.innerHTML = current === "en" && EN[k] != null ? EN[k] : PL.get(n);
    });
    document.documentElement.lang = current;
    document.title = current === "en" ? EN["meta.title"] : DOC_TITLE_PL;
    document.querySelectorAll("[data-lang-btn]").forEach(b =>
      b.setAttribute("aria-pressed", String(b.dataset.langBtn === current)));
    try { localStorage.setItem("msf-tfp-lang", current); } catch (e) {}
    try {
      const u = new URL(location.href);
      if (current === "en") u.searchParams.set("lang", "en"); else u.searchParams.delete("lang");
      history.replaceState(null, "", u);
    } catch (e) {}
  }

  document.querySelectorAll("[data-lang-btn]").forEach(b =>
    b.addEventListener("click", () => set(b.dataset.langBtn)));

  let start = "pl";
  const q = new URLSearchParams(location.search).get("lang");
  let saved = null;
  try { saved = localStorage.getItem("msf-tfp-lang"); } catch (e) {}
  if (q) start = q;
  else if (saved) start = saved;
  else if (!/^pl\b/i.test(navigator.language || "pl")) start = "en";
  set(start);

  /* „Wyślij parze": systemowe udostępnianie na telefonie, na komputerze kopia linku.
     Link zawsze bez ?lang, żeby odbiorca dostał stronę w swoim języku. */
  document.querySelectorAll("[data-share]").forEach(b => {
    b.addEventListener("click", async () => {
      const url = location.origin + location.pathname;
      try {
        if (navigator.share) { await navigator.share({ title: document.title, url }); return; }
        await navigator.clipboard.writeText(url);
        const t = b.innerHTML; b.textContent = current === "en" ? "Link copied" : "Link skopiowany";
        setTimeout(() => { b.innerHTML = t; }, 1800);
      } catch (e) {}
    });
  });
})();
