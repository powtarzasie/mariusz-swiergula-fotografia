// MAKIETY 2026-11-11: wejścia elementów + formularz-zaślepka (składa gotową wiadomość w poczcie, niczego nie wysyła sam).
(function () {
  // 2026-11-12: animacja wjazdu elementów (.rv) usunięta po audycie „śladów AI": treść jest widoczna od razu.

  // Menu na telefonie: wybór pozycji zamyka panel
  var menu = document.querySelector('.menu');
  if (menu) menu.addEventListener('click', function (e) { if (e.target.closest('a')) menu.removeAttribute('open'); });

  // Formularz: temat pokazuje właściwe pytania; „Napisz wiadomość" otwiera pocztę z gotową treścią
  var f = document.querySelector('.form');
  if (!f) return;
  var NAZWY = { wizerunek: 'Wizerunek', wnetrza: 'Wnętrza', slub: 'Ślub', rodzina: 'Sesja rodzinna', inne: 'Inne' };
  function temat() { var r = f.querySelector('input[name=temat]:checked'); return r ? r.value : 'inne'; }
  // adres /kontakt/?temat=slub zaznacza temat z góry (linki „Zapytaj o termin" z działów)
  var zAdresu = (location.search.match(/[?&]temat=([a-z]+)/) || [])[1];
  var wybor = zAdresu && f.querySelector('input[name=temat][value="' + zAdresu + '"]');
  if (wybor) wybor.checked = true;
  function ustaw() { f.setAttribute('data-temat', temat()); }
  f.addEventListener('change', ustaw); ustaw();
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = temat(), linie = [];
    [].forEach.call(f.querySelectorAll('[data-etykieta]'), function (p) {
      var blok = p.closest('[data-dla]');
      if (blok && blok.getAttribute('data-dla').split(' ').indexOf(t) < 0) return;
      if (p.value.trim()) linie.push(p.getAttribute('data-etykieta') + ': ' + p.value.trim());
    });
    location.href = 'mailto:' + f.getAttribute('data-adres') +
      '?subject=' + encodeURIComponent('Zapytanie: ' + NAZWY[t]) +
      '&body=' + encodeURIComponent(linie.join('\n'));
  });
})();
