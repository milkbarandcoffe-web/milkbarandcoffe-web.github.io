/* Presentazioni parlate DZ: motore comune.
   La pagina definisce window.PRES = { id, marchio, vel, etichette:{tu,ai}, inizio:{t,x,chat,firma}, slide:[...], wa }
   Slide: t titolo, x testo, l punti, n passi numerati, chat [{da:'tu'|'ai', t}], chiave true, fine true, link {t,href}, v testo letto.
   {NOME} nel testo = ", Nome" se l'indirizzo ha ?nome=Nome. ?tel=39... aggiunge WhatsApp alla fine. */
(function () {
  'use strict';
  var P = window.PRES || {}, S = P.slide || [];
  var q = { get: function () { return null; } };
  try { q = new URLSearchParams(location.search); } catch (e) {}
  var NOME = (q.get('nome') || '').trim().slice(0, 30);
  var TEL = (q.get('tel') || '').replace(/\D/g, '').slice(0, 15);
  var conf = {};
  try { conf = JSON.parse(localStorage.getItem('dz-pres-voce') || '{}') || {}; } catch (e) { conf = {}; }
  var VEL = Number(conf.vel) || P.vel || 1.1;
  var ET = P.etichette || { tu: 'Tu', ai: 'Claude' };
  var i = -1, parla = false, giro = 0, voce = null, tVoce = null, video = false, tConto = null, blocco = null, tEsci = null, tVideo = 0;

  function g(id) { return document.getElementById(id); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function nm(s) { return String(s == null ? '' : s).replace(/\{NOME\}/g, NOME ? ', ' + NOME : ''); }
  var ICO = {
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4.5" height="16" rx="1.2"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.2"/></svg>',
    prima: '<svg viewBox="0 0 24 24"><path d="M15.5 5 8.5 12l7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dopo: '<svg viewBox="0 0 24 24"><path d="m8.5 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  var CHIAVE = '<svg class="chiave" viewBox="0 0 240 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"><circle cx="50" cy="50" r="32"/><circle cx="50" cy="50" r="9"/><path d="M82 50h140M190 50v24M210 50v16M168 50v14"/></g></svg>';

  // ---------- Struttura della pagina ----------
  document.body.innerHTML =
    '<div class="testa"><div class="riga"><span class="firma"></span><span id="num"></span></div><div class="barra"><i id="barra"></i></div></div>' +
    '<main><div class="slide" id="slide" aria-live="polite"></div></main>' +
    '<div class="sotto">' +
    '<div class="com"><button class="tondo" id="prima" aria-label="Indietro">' + ICO.prima + '</button>' +
    '<button class="play" id="play" aria-label="Ascolta">' + ICO.play + '</button>' +
    '<button class="tondo" id="dopo" aria-label="Avanti">' + ICO.dopo + '</button></div>' +
    '<div class="strumenti"><button id="bVoce">Voce</button><button id="bVideo">Video</button><button id="bTesto">Testo</button></div>' +
    '<p class="avviso" id="avviso"></p></div>' +
    '<div class="velo" id="velo"></div>' +
    '<div class="foglio" id="fVoce" role="dialog" aria-label="Voce"></div>' +
    '<div class="foglio" id="fTesto" role="dialog" aria-label="Testo letto"></div>' +
    '<div class="conto" id="conto"></div>' +
    '<button class="btn pieno esci" id="esci">Tocca di nuovo per uscire</button>';
  document.querySelector('.firma').textContent = P.marchio || '';

  function avvisa(m) { g('avviso').textContent = m || ''; }
  function tastoPlay() { g('play').innerHTML = parla ? ICO.pausa : ICO.play; g('play').setAttribute('aria-label', parla ? 'Pausa' : 'Ascolta'); }

  function chat(lista, s) {
    var c = el('div', 'chat');
    lista.forEach(function (m, k) {
      if (s.classList.contains('inizio') && m.da === 'ai' && k > 0) {
        var p = el('div', 'scrive'); p.appendChild(el('i')); p.appendChild(el('i')); p.appendChild(el('i')); c.appendChild(p);
      }
      var b = el('div', 'msg ' + (m.da === 'ai' ? 'ai' : 'tu'));
      b.appendChild(el('small', '', m.chi || (m.da === 'ai' ? ET.ai : ET.tu)));
      b.appendChild(document.createTextNode(m.t));
      c.appendChild(b);
    });
    s.appendChild(c);
  }

  // ---------- Copertina ----------
  function inizio() {
    var d = P.inizio || {}, s = g('slide');
    s.className = 'slide inizio'; s.innerHTML = '';
    s.appendChild(el('h1', '', d.t || ''));
    if (d.x) s.appendChild(el('p', 'testo', d.x));
    if (d.chat) chat(d.chat, s);
    if (d.firma) s.appendChild(el('p', 'piccolo', d.firma));
    g('prima').classList.add('nascosto'); g('dopo').classList.remove('nascosto');
    g('num').textContent = ''; g('barra').style.width = '0';
    requestAnimationFrame(function () { s.classList.add('vis'); });
  }

  // ---------- Slide ----------
  function mostra() {
    var d = S[i], s = g('slide');
    s.className = 'slide'; s.innerHTML = '';
    if (d.chiave) s.insertAdjacentHTML('beforeend', CHIAVE);
    s.appendChild(el('h1', '', nm(d.t)));
    if (d.x) s.appendChild(el('p', 'testo', nm(d.x)));
    if (d.l || d.n) {
      var ul = el(d.n ? 'ol' : 'ul');
      (d.n || d.l).forEach(function (t) { ul.appendChild(el('li', '', t)); });
      s.appendChild(ul);
    }
    if (d.chat) chat(d.chat, s);
    if (d.fine) {
      var az = el('div', 'azioni');
      if (TEL && P.wa) {
        var w = el('a', 'btn pieno', 'Scrivi su WhatsApp');
        w.href = 'https://wa.me/' + TEL + '?text=' + encodeURIComponent(nm(P.wa));
        w.target = '_blank'; w.rel = 'noopener'; w.onclick = ferma;
        az.appendChild(w);
      }
      if (d.link) {
        var a = el('a', 'btn' + (TEL && P.wa ? '' : ' pieno'), d.link.t);
        a.href = d.link.href; a.onclick = ferma;
        az.appendChild(a);
      }
      var r = el('button', 'btn', 'Riascolta dall\'inizio');
      r.onclick = function () { ferma(); i = 0; mostra(); avvia(); };
      az.appendChild(r);
      s.appendChild(az);
    }
    g('num').textContent = (i + 1) + ' di ' + S.length;
    g('barra').style.width = Math.round((i + 1) / S.length * 100) + '%';
    g('prima').classList.toggle('nascosto', i <= 0);
    g('dopo').classList.toggle('nascosto', i >= S.length - 1);
    tastoPlay();
    requestAnimationFrame(function () { requestAnimationFrame(function () { s.classList.add('vis'); }); });
  }

  // ---------- Voce ----------
  function voci() {
    if (!window.speechSynthesis) return [];
    try { return speechSynthesis.getVoices().filter(function (v) { return /^it/i.test(v.lang); }); } catch (e) { return []; }
  }
  function scegliVoce() {
    var vs = voci();
    if (!vs.length) return null;
    if (conf.voce) { var f0 = vs.filter(function (v) { return v.name === conf.voce; })[0]; if (f0) return f0; }
    var pref = P.voci || ['alice', 'federica', 'google italiano', 'luca', 'paola', 'elsa'];
    for (var k = 0; k < pref.length; k++) {
      var f = vs.filter(function (v) { return v.name.toLowerCase().indexOf(pref[k]) >= 0; })[0];
      if (f) return f;
    }
    return vs[0];
  }
  if (window.speechSynthesis) {
    try { speechSynthesis.onvoiceschanged = function () { voce = scegliVoce(); if (g('fVoce').classList.contains('su')) foglioVoce(); }; voce = scegliVoce(); } catch (e) {}
  }
  // App Android di Daniel (DZ App / Viewer): la WebView non ha speechSynthesis, la voce arriva da window.DZ.
  function dzVoce() { try { return window.DZ && window.DZ.voce ? Number(window.DZ.voce()) : 0; } catch (e) { return 0; } }

  function sveglia(on) {
    try {
      if (on && !blocco && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (b) { blocco = b; }).catch(function () {});
      if (!on && blocco) { blocco.release(); blocco = null; }
    } catch (e) {}
  }

  function avvia(n) {
    n = Number(n) || 0;
    if (!window.speechSynthesis) {
      var d = dzVoce();
      if (d === 2 && n < 6) { if (!n) avvisa('Preparo la voce...'); setTimeout(function () { avvia(n + 1); }, 700); return; }
      if (d !== 1) { avvisa('Questo telefono non legge ad alta voce: leggi le slide e vai avanti.'); parla = false; tastoPlay(); return; }
    }
    avvisa('');
    parla = true; tastoPlay(); sveglia(true);
    leggi();
  }

  function ferma() {
    parla = false; giro++; clearTimeout(tVoce);
    try { if (window.speechSynthesis) speechSynthesis.cancel(); else if (window.DZ && window.DZ.zitto) window.DZ.zitto(); } catch (e) {}
    tastoPlay(); sveglia(false);
  }

  function frasi(t) { return t.match(/[^.!?]+[.!?]*/g) || [t]; }
  // Pronuncia per la voce del telefono (solo per la lettura, il testo mostrato non cambia).
  function pron(t) { (P.pronuncia || []).forEach(function (c) { t = t.split(c[0]).join(c[1]); }); return t; }

  function leggi() {
    var mio = ++giro; clearTimeout(tVoce);
    var testo = pron(nm(S[i].v)), fatto = false;
    var fine = function () {
      if (fatto || mio !== giro) return; fatto = true; clearTimeout(tVoce);
      if (!parla) return;
      if (i < S.length - 1) {
        tVoce = setTimeout(function () { if (mio !== giro || !parla) return; i++; mostra(); leggi(); }, Math.round(900 / VEL));
      } else { parla = false; tastoPlay(); sveglia(false); }
    };
    // riserva se il telefono non avvisa la fine della lettura
    var riserva = Math.max(4000, Math.round(testo.length * 95 / VEL)) + 1500;
    if (!window.speechSynthesis) {
      try { window.DZ.parla(testo, VEL); } catch (e) {}
      var t0 = Date.now();
      var guarda = function () {
        if (mio !== giro) return;
        var st = 2; try { st = Number(window.DZ.voceStato()); } catch (e) {}
        if (st !== 1 || Date.now() - t0 > riserva + 4000) { fine(); return; }
        tVoce = setTimeout(guarda, 300);
      };
      tVoce = setTimeout(guarda, 400);
      return;
    }
    try { speechSynthesis.cancel(); } catch (e) {}
    if (!voce) voce = scegliVoce();
    var fs = frasi(testo);
    fs.forEach(function (f, j) {
      var u = new SpeechSynthesisUtterance(f.trim());
      u.lang = 'it-IT'; if (voce) u.voice = voce; u.rate = VEL; u.pitch = 1;
      if (j === fs.length - 1) { u.onend = fine; u.onerror = function () {}; }
      speechSynthesis.speak(u);
    });
    tVoce = setTimeout(fine, riserva);
  }

  // ---------- Fogli: voce e testo ----------
  function apri(id) { chiudi(); document.body.classList.add('aperto'); g(id).classList.add('su'); }
  function chiudi() { document.body.classList.remove('aperto'); g('fVoce').classList.remove('su'); g('fTesto').classList.remove('su'); }
  g('velo').onclick = chiudi;

  function foglioVoce() {
    var f = g('fVoce'); f.innerHTML = '';
    f.appendChild(el('h2', '', 'Voce e video'));
    var vs = voci();
    if (vs.length) {
      f.appendChild(el('label', '', 'Voce'));
      var sel = el('select');
      vs.forEach(function (v) { var o = el('option', '', v.name); o.value = v.name; if (voce && v.name === voce.name) o.selected = true; sel.appendChild(o); });
      sel.onchange = function () { voce = vs.filter(function (v) { return v.name === sel.value; })[0] || null; conf.voce = sel.value; salva(); };
      f.appendChild(sel);
    } else {
      f.appendChild(el('p', '', window.speechSynthesis ? 'Questo telefono ha una sola voce italiana.' : 'In questa app la voce è quella del telefono.'));
    }
    var lab = el('label', '', 'Velocità: ' + VEL.toFixed(2).replace('.', ','));
    f.appendChild(lab);
    var r = el('input'); r.type = 'range'; r.min = '0.8'; r.max = '1.5'; r.step = '0.05'; r.value = String(VEL);
    r.oninput = function () { VEL = Number(r.value); lab.textContent = 'Velocità: ' + VEL.toFixed(2).replace('.', ','); conf.vel = VEL; salva(); };
    f.appendChild(r);
    var az = el('div', 'azioni');
    var prova = el('button', 'btn', 'Prova la voce');
    prova.onclick = function () {
      ferma();
      try {
        if (window.speechSynthesis) { var u = new SpeechSynthesisUtterance('Ciao! Questa è la voce della presentazione.'); u.lang = 'it-IT'; if (voce) u.voice = voce; u.rate = VEL; speechSynthesis.speak(u); }
        else if (window.DZ && window.DZ.parla) window.DZ.parla('Ciao! Questa è la voce della presentazione.', VEL);
      } catch (e) {}
    };
    az.appendChild(prova);
    f.appendChild(az);
    f.appendChild(el('h3', '', 'Fare un video'));
    var ol = el('ol');
    ['Avvia la registrazione dello schermo del telefono, con i suoni multimediali.',
     'Torna qui e tocca Video: dopo 3 secondi parte la presentazione, senza tasti.',
     'Alla fine ferma la registrazione. Per uscire prima: tocca due volte lo schermo.'
    ].forEach(function (t) { ol.appendChild(el('li', '', t)); });
    f.appendChild(ol);
    f.appendChild(el('p', 'piccolo', 'Per un\'altra voce, per esempio la tua, usa Testo: c\'è tutto il parlato da copiare.'));
    var az2 = el('div', 'azioni');
    var v = el('button', 'btn pieno', 'Avvia il video'); v.onclick = videoAvvia; az2.appendChild(v);
    var c = el('button', 'btn', 'Chiudi'); c.onclick = chiudi; az2.appendChild(c);
    f.appendChild(az2);
  }
  function salva() { try { localStorage.setItem('dz-pres-voce', JSON.stringify({ voce: conf.voce || '', vel: VEL })); } catch (e) {} }

  function testoTutto() {
    return S.map(function (d, k) { return (k + 1) + '. ' + nm(d.t) + '\n' + nm(d.v); }).join('\n\n');
  }
  function foglioTesto() {
    var f = g('fTesto'); f.innerHTML = '';
    f.appendChild(el('h2', '', 'Il testo letto'));
    f.appendChild(el('p', 'piccolo', 'Copialo per registrarlo con un\'altra voce o con la tua.'));
    var az = el('div', 'azioni');
    var cp = el('button', 'btn pieno', 'Copia tutto il testo');
    cp.onclick = function () { copia(testoTutto(), cp); };
    az.appendChild(cp);
    f.appendChild(az);
    S.forEach(function (d, k) { f.appendChild(el('h3', '', (k + 1) + '. ' + nm(d.t))); f.appendChild(el('p', '', nm(d.v))); });
    var az2 = el('div', 'azioni'); var c = el('button', 'btn', 'Chiudi'); c.onclick = chiudi; az2.appendChild(c); f.appendChild(az2);
  }
  function copia(t, b) {
    var ok = function () { b.textContent = 'Copiato'; setTimeout(function () { b.textContent = 'Copia tutto il testo'; }, 2000); };
    var riserva = function () {
      try { var a = el('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); ok(); }
      catch (e) { b.textContent = 'Non riesco a copiare: tieni premuto sul testo'; }
    };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(ok, riserva); return; } } catch (e) {}
    riserva();
  }

  // ---------- Modalita video ----------
  function videoAvvia() {
    chiudi(); ferma();
    // la voce si sblocca con il tocco, prima del conto alla rovescia
    try { if (window.speechSynthesis) { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) {}
    video = true; tVideo = Date.now(); document.body.classList.add('video');
    try { var r = document.documentElement, fs = r.requestFullscreen || r.webkitRequestFullscreen; if (fs) { var p = fs.call(r); if (p && p.catch) p.catch(function () {}); } } catch (e) {}
    sveglia(true);
    conto(3);
  }
  function conto(n) {
    var c = g('conto');
    if (n > 0) { c.textContent = n; c.classList.add('vis'); tConto = setTimeout(function () { conto(n - 1); }, 1000); return; }
    c.classList.remove('vis'); i = 0; mostra(); avvia();
  }
  function videoEsci() {
    video = false; clearTimeout(tConto); g('conto').classList.remove('vis'); g('esci').classList.remove('vis');
    document.body.classList.remove('video'); ferma();
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  }
  // In video: primo tocco = compare il tasto, secondo tocco (ovunque, entro 2,5 s) = esce.
  document.addEventListener('click', function (ev) {
    if (!video || Date.now() - tVideo < 700) return;
    var b = g('esci');
    if (b.classList.contains('vis') || ev.target === b) { videoEsci(); return; }
    b.classList.add('vis'); clearTimeout(tEsci);
    tEsci = setTimeout(function () { b.classList.remove('vis'); }, 2500);
  });

  // ---------- Comandi ----------
  g('play').onclick = function () {
    if (parla) { ferma(); return; }
    if (i < 0) { i = 0; mostra(); }
    avvia();
  };
  g('dopo').onclick = function () {
    var on = parla; ferma();
    if (i < S.length - 1) { i++; mostra(); if (on || i === 0) avvia(); }
  };
  g('prima').onclick = function () {
    var on = parla; ferma();
    if (i > 0) { i--; mostra(); if (on) avvia(); }
  };
  g('bVoce').onclick = function () { foglioVoce(); apri('fVoce'); };
  g('bTesto').onclick = function () { foglioTesto(); apri('fTesto'); };
  g('bVideo').onclick = videoAvvia;
  document.addEventListener('keydown', function (e) {
    if (document.body.classList.contains('aperto')) { if (e.key === 'Escape') chiudi(); return; }
    if (e.key === 'ArrowRight') g('dopo').click();
    else if (e.key === 'ArrowLeft') g('prima').click();
    else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); g('play').click(); }
    else if (e.key === 'Escape' && video) videoEsci();
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && parla && !video) ferma(); });
  inizio();
})();
