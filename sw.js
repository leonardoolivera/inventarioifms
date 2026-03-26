// Service Worker — Inventário Campus v3.3
const CACHE = 'inventario-v3.3';
const ASSETS = [
  '/inventarioifms/',
  '/inventarioifms/index.html',
  '/inventarioifms/manifest.json',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Não intercepta chamadas ao Apps Script
  if (e.request.url.indexOf('script.google.com') > -1) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(res) {
        // Atualiza cache com versão mais nova
        var clone = res.clone();
        caches.open(CACHE).then(function(cache){ cache.put(e.request, clone); });
        return res;
      });
    }).catch(function() {
      return caches.match('/inventarioifms/');
    })
  );
});
