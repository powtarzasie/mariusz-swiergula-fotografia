/* ============================================================================
   TREŚĆ HISTORII (jedna sesja = jeden taki plik).
   Szablon jest uniwersalny: ten plik zmienia się dla każdej pary,
   układ (koncepcja A/B/C) i silnik zostają te same.

   Bloki w rozdziale:
     pelne  : jedno zdjęcie na całą szerokość (moment kulminacyjny)
     jedno  : jedno zdjęcie, mniejsze, z oddechem wokół
     rzad   : 2-3 zdjęcia obok siebie (równa wysokość, proporcje zachowane)
     klatki : seria zrobiona w kilka sekund (pokazana jak pasek kliszy)
     slowo  : krótkie zdanie między zdjęciami
   Godziny przy zdjęciach czytamy z EXIF (album/wymiary.js), nie wpisujemy ręcznie.
   ========================================================================== */
window.HISTORIA = {
  para: "Kinga & Marek",
  tytul: "Czternaście",
  podtytul: "Sesja w czternastą rocznicę ślubu",
  miejsce: "Park, złota polska jesień",
  data: "2026-10-17",
  dataSlownie: "17 października 2026",
  motyw: "jesien",                          // akcent tematyczny: jesien | zima | wiosna | lato | brak
  okladka: "MS_02879",
  okladkaPion: "MS_04292",

  rozdzialy: [
    {
      nr: "I", czas: "15:10", tytul: "Z walizką do parku",
      tekst: "Przyjechaliście z zieloną walizką, jakbyście wyjeżdżali na wakacje. Pierwsze, co zrobiliście na miejscu, to spojrzeliście w górę. Liście były już żółte.",
      tlo: "#17201A",
      bloki: [
        { typ: "jedno", f: "MS_02578" },
        { typ: "klatki", f: ["MS_02618", "MS_02623", "MS_02625"] },
        { typ: "pelne", f: "MS_02651" },
        { typ: "rzad", f: ["MS_02825", "MS_02879"] }
      ]
    },
    {
      nr: "II", czas: "15:32", tytul: "W trawach",
      tekst: "Słońce zeszło nisko i weszło w trawy. Gdzieś tutaj przestaliście pozować i zaczęliście ze sobą rozmawiać.",
      tlo: "#262013",
      bloki: [
        { typ: "rzad", f: ["MS_03045", "MS_03059"] },
        { typ: "pelne", f: "MS_03075" },
        { typ: "jedno", f: "MS_03099" },
        { typ: "rzad", f: ["MS_03172", "MS_03190"] },
        { typ: "rzad", f: ["MS_03241", "MS_03266"] },
        { typ: "pelne", f: "MS_03287" },
        { typ: "slowo", tekst: "Ręka na ramieniu. Tak, jak się trzyma kogoś od czternastu lat." },
        { typ: "rzad", f: ["MS_03293", "MS_03349"] },
        { typ: "rzad", f: ["MS_03307", "MS_03324", "MS_03375"] }
      ]
    },
    {
      nr: "III", czas: "15:56", tytul: "Różowy sweter",
      tekst: "Zrobiło się chłodniej, więc z torby wyszedł różowy sweter i fascynator. Do ławki pod klonem było kilka kroków.",
      tlo: "#28161F",
      bloki: [
        { typ: "pelne", f: "MS_03482" },
        { typ: "rzad", f: ["MS_03509", "MS_03527", "MS_03550"] },
        { typ: "rzad", f: ["MS_03604", "MS_03611"] },
        { typ: "pelne", f: "MS_03620" },
        { typ: "slowo", tekst: "16:03. Telefon w jednej ręce, łza na policzku." },
        { typ: "jedno", f: "MS_03649" },
        { typ: "rzad", f: ["MS_03669", "MS_03699"] },
        { typ: "rzad", f: ["MS_03702", "MS_03739"] },
        { typ: "klatki", f: ["MS_03764", "MS_03790", "MS_03793"] }
      ]
    },
    {
      nr: "IV", czas: "16:18", tytul: "Pod niebem",
      tekst: "Na otwartej łące zostało niebo i dwie sylwetki. Zatańczyliście bez muzyki.",
      tlo: "#131A26",
      bloki: [
        { typ: "pelne", f: "MS_03866" },
        { typ: "pelne", f: "MS_03871" },
        { typ: "jedno", f: "MS_03962" },
        { typ: "rzad", f: ["MS_04005", "MS_04034", "MS_04050"] },
        { typ: "rzad", f: ["MS_04069", "MS_04089"] },
        { typ: "pelne", f: "MS_04095" },
        { typ: "rzad", f: ["MS_04277", "MS_04292"] }
      ]
    },
    {
      nr: "V", czas: "16:42", tytul: "Huśtawki",
      tekst: "Ktoś zauważył plac zabaw. Po czternastu latach dalej potraficie się przy sobie wygłupiać.",
      tlo: "#1B2119",
      bloki: [
        { typ: "jedno", f: "MS_04325" },
        { typ: "rzad", f: ["MS_04363", "MS_04391"] },
        { typ: "pelne", f: "MS_04457" },
        { typ: "rzad", f: ["MS_04554", "MS_04583"] },
        { typ: "rzad", f: ["MS_04635", "MS_04650", "MS_04657"] },
        { typ: "rzad", f: ["MS_04662", "MS_04679"] }
      ]
    },
    {
      nr: "VI", czas: "16:59", tytul: "Za rękę",
      tekst: "Wracaliście tą samą ścieżką, którą przyszliście. Już bez pośpiechu.",
      tlo: "#1F150F",
      bloki: [
        { typ: "rzad", f: ["MS_04738", "MS_04759"] },
        { typ: "jedno", f: "MS_04769" },
        { typ: "pelne", f: "MS_04894" },
        { typ: "slowo", tekst: "17:49. Kartka, którą przynieśliście ze sobą." },
        { typ: "rzad", f: ["MS_05027", "MS_05106"] }
      ]
    }
  ],

  final: {
    czas: "18:13",
    tytul: "Kawa na rozgrzanie",
    tekst: "Tak skończył się ten dzień. Trzy godziny, sześćdziesiąt cztery zdjęcia, czternaście lat.",
    podpis: "Zdjęcia: Mariusz Świerguła"
  },

  /* BONUS: film bez reklam. wideo = adres pliku MP4 (np. Cloudflare R2), pusty = „w przygotowaniu" */
  bonus: {
    tytul: "Film z tego dnia",
    opis: "Dodatkowy materiał wideo, tylko dla Was.",
    poster: "MS_04894",
    wideo: "",
    dlugosc: ""
  },

  /* POBIERANIE: paczki ZIP pod adresami nie do zgadnięcia; na telefonie zapis pojedynczych zdjęć z podglądu */
  pobierz: {
    pelne:  { ile: 149, rozmiar: "ok. 620 MB", opis: "Pełna rozdzielczość, do druku i na pamiątkę", url: "" },
    lekkie: { ile: 149, rozmiar: "ok. 70 MB",  opis: "Mniejsze pliki na telefon i do internetu", url: "" }
  },

  /* WASZE SŁOWA: dwa etapy. Tekst wklejam ja (po akceptacji pary); pusty etap = formularz dla pary */
  opinie: {
    poSesji: { data: "", podpis: "", tekst: "" },
    poZdjeciach: { data: "", podpis: "", tekst: "" }
  },
  kontakt: "mariusz.swiergula@gmail.com"
};
