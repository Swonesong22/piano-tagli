/* Piano Tagli: conserva l'app sul telefono per usarla anche senza internet.
   Versione c888f9740e: quando cambia, i telefoni scaricano da soli la versione nuova. */
'use strict';
const VERSIONE = 'piano-tagli-c888f9740e';
const FILE = ['./', 'index.html', 'manifest.webmanifest', 'icona-192.png', 'icona-512.png', 'icona-maskable-512.png', 'icona-180.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSIONE)
    .then(function (c) { return c.addAll(FILE.map(function (f) { return new Request(f, { cache: 'reload' }); })); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys()
    .then(function (nomi) {
      return Promise.all(nomi.filter(function (n) { return n.indexOf('piano-tagli-') === 0 && n !== VERSIONE; })
        .map(function (n) { return caches.delete(n); }));
    })
    .then(function () { return self.clients.claim(); }));
});

/* Si risponde subito con la copia conservata (funziona anche senza rete)
   e intanto, se c'è internet, si scarica quella aggiornata per la prossima volta. */
self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSIONE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (copia) {
      const rete = fetch(req).then(function (r) {
        if (r && r.ok && r.type === 'basic') cache.put(req, r.clone());
        return r;
      }).catch(function () { return null; });
      if (copia) { e.waitUntil(rete); return copia; }
      return rete.then(function (r) {
        if (r) return r;
        if (req.mode === 'navigate') return cache.match('index.html');
        return Response.error();
      });
    });
  }));
});
