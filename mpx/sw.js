// Service worker minimo: serve per poter installare MAGICPRINT-X come app. La pagina vera è su script.google.com.
var C = 'mpx-v3';
self.addEventListener('install', function (e) { e.waitUntil(caches.open(C).then(function (c) { return c.addAll(['./', 'manifest.json', 'icona-192.png', 'icona-512.png']); })); self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).catch(function () { return caches.match(e.request, {ignoreSearch: true}); }));
});
