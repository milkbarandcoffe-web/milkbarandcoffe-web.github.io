/* Presentazioni parlate DZ: motore comune.
   La pagina definisce window.PRES = { id, marchio, vel, tono, audio:{src,t:[inizio di ogni slide in secondi]}, etichette:{tu,ai}, inizio:{t,x,chat,firma}, slide:[...], wa }
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
  // dz-pres-voce2: valori nuovi (6/11/2026: voce piu grave, velocita 1,2) anche per chi aveva gia scelto.
  try { conf = JSON.parse(localStorage.getItem('dz-pres-voce2') || '{}') || {}; } catch (e) { conf = {}; }
  var VEL = Number(conf.vel) || P.vel || 1.2;
  var TONO = Number(conf.tono) || P.tono || 0.85;
  var ET = P.etichette || { tu: 'Tu', ai: 'Claude' };
  // Voce registrata (P.audio): un solo file mp3, la slide cambia ai tempi di P.audio.t; velocita originale.
  var AU = P.audio && P.audio.src && P.audio.t && P.audio.t.length === S.length ? P.audio : null, au = null, auKo = false;
  var i = -1, parla = false, giro = 0, voce = null, tVoce = null, tFrase = null, video = false, tConto = null, blocco = null, tEsci = null, tVideo = 0;

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

  // Tasti in basso: PRES.strumenti (default Voce, Video, Testo). Altri: indice, domande (PRES.domande = {href}).
  var NOMI_STR = { voce: 'Voce', video: 'Video', testo: 'Testo', indice: 'Indice', domande: 'Domande' };
  var STRUMENTI = (P.strumenti || ['voce', 'video', 'testo']).filter(function (k) { return NOMI_STR[k] && (k !== 'domande' || (P.domande && P.domande.href)); });

  // ---------- Struttura della pagina ----------
  document.body.innerHTML =
    '<div class="testa"><div class="riga"><span class="firma"></span><span id="num"></span></div><div class="barra"><i id="barra"></i></div></div>' +
    '<main><div class="slide" id="slide" aria-live="polite"></div></main>' +
    '<div class="sotto">' +
    '<div class="com"><button class="tondo" id="prima" aria-label="Indietro">' + ICO.prima + '</button>' +
    '<button class="play" id="play" aria-label="Ascolta">' + ICO.play + '</button>' +
    '<button class="tondo" id="dopo" aria-label="Avanti">' + ICO.dopo + '</button></div>' +
    '<div class="strumenti">' + STRUMENTI.map(function (k) { return '<button id="b' + k.charAt(0).toUpperCase() + k.slice(1) + '">' + NOMI_STR[k] + '</button>'; }).join('') + '</div>' +
    '<p class="avviso" id="avviso"></p></div>' +
    '<div class="velo" id="velo"></div>' +
    '<div class="foglio" id="fVoce" role="dialog" aria-label="Voce"></div>' +
    '<div class="foglio" id="fTesto" role="dialog" aria-label="Testo letto"></div>' +
    '<div class="foglio" id="fIndice" role="dialog" aria-label="Indice"></div>' +
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
    if (d.link && !d.fine) {
      var az0 = el('div', 'azioni');
      var a0 = el('a', 'btn pieno', d.link.t);
      a0.href = d.link.href; a0.target = '_blank'; a0.rel = 'noopener';
      az0.appendChild(a0);
      s.appendChild(az0);
    }
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
        if (d.link.nuova) { a.target = '_blank'; a.rel = 'noopener'; }
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
  // Voce piu naturale: prima le voci di qualita alta (Natural, Neural, Premium, Enhanced, Online), poi l'elenco preferito.
  function punti(v) {
    var n = v.name.toLowerCase(), p = 0;
    if (/natural|neural|premium|enhanced|migliorat|online/.test(n)) p += 100;
    if (v.localService === false) p += 10;
    var pref = P.voci || ['alice', 'federica', 'google italiano', 'elsa', 'isabella', 'luca', 'paola'];
    for (var k = 0; k < pref.length; k++) if (n.indexOf(pref[k]) >= 0) { p += (pref.length - k) * 2; break; }
    return p;
  }
  function scegliVoce() {
    var vs = voci();
    if (!vs.length) return null;
    if (conf.voce) { var f0 = vs.filter(function (v) { return v.name === conf.voce; })[0]; if (f0) return f0; }
    var best = vs[0], bp = -1;
    vs.forEach(function (v) { var p = punti(v); if (p > bp) { bp = p; best = v; } });
    return best;
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

  function registrata() { return !!AU && !auKo && conf.tipo !== 'tel'; }
  function lettore() {
    if (au) return au;
    au = new Audio(); au.preload = 'auto'; au.src = AU.src;
    au.addEventListener('timeupdate', function () {
      if (!parla || !registrata()) return;
      var n = i;
      while (n < S.length - 1 && au.currentTime >= AU.t[n + 1] - 0.05) n++;
      if (n !== i) { i = n; mostra(); }
    });
    au.addEventListener('ended', function () { if (parla && registrata()) { parla = false; tastoPlay(); sveglia(false); } });
    au.addEventListener('error', function () { if (registrata()) riserva('errore'); });
    return au;
  }
  // Se la voce registrata non parte: voce del telefono.
  function riserva(perche) {
    var on = parla; auKo = true;
    try { if (au) au.pause(); } catch (e) {}
    avvisa('Voce registrata non disponibile: uso la voce del telefono.');
    if (on) { parla = false; avvia(); }
  }
  function avviaRegistrata() {
    var a = lettore(), mio = ++giro;
    avvisa('');
    parla = true; tastoPlay(); sveglia(true);
    // riprende dal punto di pausa se e nella slide mostrata, altrimenti dall'inizio della slide
    try {
      var k = Math.max(0, i), da = AU.t[k], a2 = k < S.length - 1 ? AU.t[k + 1] : 1e9, pos = a.currentTime;
      a.playbackRate = 1;
      if (a.ended || !(pos >= da && pos < a2 - 0.3)) a.currentTime = da;
    } catch (e) {}
    var pr;
    try { pr = a.play(); } catch (e) { riserva('play'); return; }
    if (pr && pr.catch) pr.catch(function (e) { if (mio === giro && parla && (!e || e.name !== 'AbortError')) riserva('play'); });
  }

  function avvia(n) {
    n = Number(n) || 0;
    if (registrata()) { avviaRegistrata(); return; }
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
    parla = false; giro++; clearTimeout(tVoce); clearTimeout(tFrase);
    try { if (au) au.pause(); } catch (e) {}
    try { if (window.speechSynthesis) speechSynthesis.cancel(); else if (window.DZ && window.DZ.zitto) window.DZ.zitto(); } catch (e) {}
    tastoPlay(); sveglia(false);
  }

  function frasi(t) { return t.match(/[^.!?]+[.!?]*/g) || [t]; }
  // Pronuncia per la voce del telefono (solo per la lettura, il testo mostrato non cambia).
  function pron(t) { (P.pronuncia || []).forEach(function (c) { t = t.split(c[0]).join(c[1]); }); return t; }

  function dzTono() { try { if (window.DZ && window.DZ.tono) window.DZ.tono(TONO); } catch (e) {} }

  function leggi() {
    var mio = ++giro; clearTimeout(tVoce); clearTimeout(tFrase);
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
      dzTono();
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
    // Una frase alla volta, con una piccola pausa tra le frasi: lettura piu calma e naturale.
    var fs = frasi(testo), j = 0;
    var prossima = function () {
      if (mio !== giro) return;
      if (j >= fs.length) { fine(); return; }
      var f = fs[j++].trim();
      if (!f) { prossima(); return; }
      var u = new SpeechSynthesisUtterance(f), fatta = false;
      u.lang = 'it-IT'; if (voce) u.voice = voce; u.rate = VEL; u.pitch = TONO;
      var dopo = function () {
        if (fatta || mio !== giro) return; fatta = true; clearTimeout(tFrase);
        tFrase = setTimeout(prossima, Math.round(260 / VEL));
      };
      u.onend = dopo; u.onerror = dopo;
      // riserva per la frase se il telefono non avvisa la fine
      tFrase = setTimeout(dopo, Math.max(2500, Math.round(f.length * 95 / VEL)) + 1500);
      speechSynthesis.speak(u);
    };
    prossima();
  }

  // ---------- Fogli: voce e testo ----------
  function apri(id) { chiudi(); document.body.classList.add('aperto'); g(id).classList.add('su'); }
  function chiudi() { document.body.classList.remove('aperto'); ['fVoce', 'fTesto', 'fIndice'].forEach(function (id) { g(id).classList.remove('su'); }); }

  // Indice: titoli delle slide (raggruppati per PRES.slide[n].sez); tocco = vai alla slide.
  function foglioIndice() {
    var f = g('fIndice'); f.innerHTML = '';
    f.appendChild(el('h2', '', 'Indice'));
    var ol = el('ul', 'indice'), sez = '';
    S.forEach(function (d, k) {
      if (d.sez && d.sez !== sez) { sez = d.sez; var h = el('li', 'sez', sez); ol.appendChild(h); }
      var li = el('li', 'voce' + (k === i ? ' qui' : ''));
      var b = el('button', '', (k + 1) + '. ' + nm(d.t));
      b.onclick = function () { var on = parla; chiudi(); ferma(); i = k; mostra(); if (on) avvia(); };
      li.appendChild(b); ol.appendChild(li);
    });
    f.appendChild(ol);
    var az = el('div', 'azioni');
    if (P.domande && P.domande.href) {
      var q = el('a', 'btn pieno', P.domande.t || 'Domande e suggerimenti');
      q.href = P.domande.href; q.target = '_blank'; q.rel = 'noopener'; q.onclick = ferma;
      az.appendChild(q);
    }
    var c = el('button', 'btn', 'Chiudi'); c.onclick = chiudi; az.appendChild(c);
    f.appendChild(az);
  }
  g('velo').onclick = chiudi;

  function foglioVoce() {
    var f = g('fVoce'); f.innerHTML = '';
    f.appendChild(el('h2', '', 'Voce e video'));
    if (AU) {
      f.appendChild(el('label', '', 'Quale voce'));
      var st = el('select');
      [['reg', 'Voce registrata'], ['tel', 'Voce del telefono']].forEach(function (x) { var o = el('option', '', x[1]); o.value = x[0]; if ((conf.tipo === 'tel' ? 'tel' : 'reg') === x[0]) o.selected = true; st.appendChild(o); });
      st.onchange = function () { ferma(); conf.tipo = st.value === 'tel' ? 'tel' : ''; auKo = false; salva(); foglioVoce(); };
      f.appendChild(st);
      if (registrata()) f.appendChild(el('p', 'piccolo', 'Voce registrata alla sua velocità originale. Velocità e tono qui sotto valgono per la voce del telefono.'));
    }
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
    var etTono = function () { return 'Tono: ' + TONO.toFixed(2).replace('.', ',') + ' (più basso = voce più grave)'; };
    var labT = el('label', '', etTono());
    f.appendChild(labT);
    var rt = el('input'); rt.type = 'range'; rt.min = '0.6'; rt.max = '1.3'; rt.step = '0.05'; rt.value = String(TONO);
    rt.oninput = function () { TONO = Number(rt.value); labT.textContent = etTono(); conf.tono = TONO; salva(); };
    f.appendChild(rt);
    var az = el('div', 'azioni');
    var prova = el('button', 'btn', 'Prova la voce');
    prova.onclick = function () {
      ferma();
      if (registrata()) {
        var a = lettore(), mio = giro;
        try { a.currentTime = AU.t[0]; var pr = a.play(); if (pr && pr.catch) pr.catch(function () { riserva('prova'); }); } catch (e) { riserva('prova'); }
        setTimeout(function () { if (mio === giro && !parla) { try { a.pause(); } catch (e) {} } }, 4000);
        return;
      }
      try {
        if (window.speechSynthesis) { var u = new SpeechSynthesisUtterance('Ciao! Questa è la voce della presentazione.'); u.lang = 'it-IT'; if (voce) u.voice = voce; u.rate = VEL; u.pitch = TONO; speechSynthesis.speak(u); }
        else if (window.DZ && window.DZ.parla) { dzTono(); window.DZ.parla('Ciao! Questa è la voce della presentazione.', VEL); }
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
  function salva() { try { localStorage.setItem('dz-pres-voce2', JSON.stringify({ voce: conf.voce || '', vel: VEL, tono: TONO, tipo: conf.tipo || '' })); } catch (e) {} }

  function testoTutto() {
    // Solo il parlato: niente numeri e titoli (una riga vuota tra le slide).
    return S.map(function (d) { return nm(d.v); }).join('\n\n');
  }
  function foglioTesto() {
    var f = g('fTesto'); f.innerHTML = '';
    f.appendChild(el('h2', '', 'Il testo letto'));
    f.appendChild(el('p', 'piccolo', 'Solo il parlato, una riga vuota tra le slide. Copialo per registrarlo con un\'altra voce o con la tua.'));
    var az = el('div', 'azioni');
    var cp = el('button', 'btn pieno', 'Copia tutto il testo');
    cp.onclick = function () { copia(testoTutto(), cp); };
    az.appendChild(cp);
    f.appendChild(az);
    S.forEach(function (d) { f.appendChild(el('p', '', nm(d.v))); });
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
    if (registrata()) {
      try { var a = lettore(); a.muted = true; var pr = a.play(); var su = function () { try { a.pause(); } catch (e) {} a.muted = false; }; if (pr && pr.then) pr.then(su, su); else su(); } catch (e) {}
    }
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
  if (g('bVoce')) g('bVoce').onclick = function () { foglioVoce(); apri('fVoce'); };
  if (g('bTesto')) g('bTesto').onclick = function () { foglioTesto(); apri('fTesto'); };
  if (g('bVideo')) g('bVideo').onclick = videoAvvia;
  if (g('bIndice')) g('bIndice').onclick = function () { foglioIndice(); apri('fIndice'); };
  if (g('bDomande')) g('bDomande').onclick = function () { ferma(); window.open(P.domande.href, '_blank', 'noopener'); };
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
