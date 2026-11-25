/* Guscio app installabile (PWA) per le app Apps Script di Daniel Zavan.
   Uso in index.html:  window.APPX = {id:'ipx', nome:'IPRATICO-X', url:'https://script.google.com/.../exec', colore:'#e65100', param:'k'(facoltativo), su:'#3e2c00' (testo sopra il colore, facoltativo, se il colore e chiaro), scritta:'#c25e00' (testo colorato su bianco, facoltativo)};
   poi <script src="../pwa/guscio.js"></script>. Accanto servono manifest.json, sw.js, icona-192.png, icona-512.png (copia da pwa/modello/).
   Flusso: aperta nel browser -> guida per installare (Android: INSTALLA o menu ⋮; iPhone: Condividi -> Aggiungi a Home).
   Installata -> "riaprila dall'icona" -> OK chiude. Aperta dall'icona -> apre l'app (iframe a tutto schermo). */
(function () {
  var A = window.APPX || {}, C = A.colore || '#e65100', SU = A.su || '#fff', CT = A.scritta || C, D = document, LS = window.localStorage;
  var ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in D);
  var android = /Android/.test(ua), safari = ios && !/CriOS|FxiOS|EdgiOS/.test(ua);
  var solo = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var q = new URLSearchParams(location.search), url = A.url, dP = null;
  function get(k) { try { return LS.getItem('appx_' + A.id + '_' + k); } catch (e) { return null; } }
  function set(k, v) { try { LS.setItem('appx_' + A.id + '_' + k, v); } catch (e) {} }
  if (A.param) {
    var t = (q.get(A.param) || q.get('c') || '').replace(/[^A-Za-z0-9]/g, '');
    if (t) set('tok', t); else t = get('tok') || '';
    if (!t) { scrivi('<h2>Link incompleto</h2><p>Apri il link che ti è arrivato per mail.</p>'); return; }
    url += (url.indexOf('?') < 0 ? '?' : '&') + A.param + '=' + t;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  var css = D.createElement('style');
  css.textContent = 'html,body{margin:0;height:100%;background:' + C + '}body{font:17px system-ui,-apple-system,sans-serif;color:#222}' +
    'iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:#fff}' +
    '#g{min-height:100%;background:#fff;box-sizing:border-box;padding:20px 18px 40px;max-width:560px;margin:0 auto}' +
    '#g .top{display:flex;align-items:center;gap:14px;margin-bottom:10px}#g .top img{width:64px;height:64px;border-radius:16px}' +
    '#g h1{font-size:24px;margin:0;color:' + CT + '}#g h2{color:' + CT + '}#g ol{padding-left:22px;line-height:1.5}#g li{margin:10px 0}' +
    '#g .b{display:block;width:100%;box-sizing:border-box;text-align:center;font-size:19px;font-weight:700;border-radius:14px;padding:16px;margin:12px 0;border:2px solid ' + C + ';cursor:pointer;text-decoration:none}' +
    '#g .p{background:' + C + ';color:' + SU + '}#g .s{background:#fff;color:' + CT + '}#g .k{display:inline-block;border:1px solid #bbb;border-radius:8px;padding:0 8px;font-weight:700;background:#f5f5f5}' +
    '#g .box{background:#fff3e0;border-radius:12px;padding:12px;margin:12px 0}#g small{color:#777}';
  D.head.appendChild(css);
  function scrivi(h) { D.body.innerHTML = '<div id="g">' + h + '</div>'; }
  function apri() { D.body.innerHTML = ''; var f = D.createElement('iframe'); f.src = url; f.allow = 'clipboard-write'; D.body.appendChild(f); }
  window.APPX_apri = function () { set('salta', '1'); apri(); };
  function fatto() {
    set('inst', '1');
    scrivi(testa() + '<h2>App installata ✓</h2><div class="box">Per completare l\'installazione <b>riaprila dall\'icona ' + A.nome + '</b> sulla schermata Home.</div>' +
      '<a class="b p" onclick="window.close();setTimeout(function(){document.getElementById(\'chiudi\').style.display=\'block\'},400)">OK</a>' +
      '<p id="chiudi" style="display:none">Ora chiudi questa scheda del browser e apri l\'app dall\'icona.</p>');
  }
  function testa() { return '<div class="top"><img src="icona-192.png" alt=""><div><h1>' + A.nome + '</h1><small>Pasticceria Zavan</small></div></div>'; }
  function guida() {
    var h = testa();
    if (get('inst') === '1') h += '<div class="box">L\'app è già installata: aprila dall\'<b>icona ' + A.nome + '</b> sulla schermata Home.</div>';
    else h += '<p><b>Installa l\'app</b> sul telefono: la trovi sempre sulla schermata Home, a tutto schermo.</p>';
    if (ios) h += '<ol>' + (safari ? '' : '<li>Apri questo link con <b>Safari</b> (su iPhone si installa solo da Safari).</li>') +
      '<li>Tocca il tasto <b>Condividi</b> <span class="k">⬆︎</span> in basso.</li><li>Scorri e tocca <b>Aggiungi alla schermata Home</b>.</li><li>Tocca <b>Aggiungi</b> in alto a destra.</li><li>Apri l\'app dall\'icona <b>' + A.nome + '</b>.</li></ol>';
    else h += '<a class="b p" id="bi" style="display:none" onclick="APPX_ins()">INSTALLA</a><ol id="pm">' +
      '<li>In alto a destra tocca i <b>tre puntini</b> <span class="k">⋮</span>.</li><li>Scorri e tocca <b>Installa app</b> (o <b>Aggiungi a schermata Home</b> → <b>Installa</b>).</li>' +
      '<li>Conferma con <b>Installa</b>.</li><li>Riapri l\'app dall\'icona <b>' + A.nome + '</b>.</li></ol>' + (android ? '' : '<small>Su computer: icona di installazione nella barra dell\'indirizzo, oppure menu ⋮ → Installa.</small>');
    h += '<a class="b s" onclick="APPX_apri()">Apri senza installare</a>';
    scrivi(h);
    if (dP) mostraBottone();
  }
  function mostraBottone() { var b = D.getElementById('bi'); if (b) { b.style.display = 'block'; var pm = D.getElementById('pm'); if (pm) pm.style.display = 'none'; } }
  window.APPX_ins = function () { if (!dP) return; dP.prompt(); dP.userChoice.then(function (r) { if (r.outcome === 'accepted') fatto(); dP = null; }); };
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); dP = e; mostraBottone(); });
  window.addEventListener('appinstalled', fatto);
  // Chiave nuova dalla pagina dell'app (ENTRA dopo una chiave sbagliata): solo dalle pagine Google (iframe dell'app);
  // si salva e si riapre l'app dentro il guscio, cosi non si esce dalla cornice.
  window.addEventListener('message', function (e) {
    var d = e.data || {}, t;
    if (!A.param || d.appx !== 'chiave' || !/^https:\/\/([a-z0-9-]+\.)*(googleusercontent\.com|script\.google\.com)$/.test(String(e.origin || ''))) return;
    t = String(d.k || '').replace(/[^A-Za-z0-9]/g, '');
    if (!t) return;
    set('tok', t);
    url = A.url + (A.url.indexOf('?') < 0 ? '?' : '&') + A.param + '=' + t;
    apri();
  });
  if (solo || q.get('diretto') === '1' || get('salta') === '1') apri(); else guida();
})();
