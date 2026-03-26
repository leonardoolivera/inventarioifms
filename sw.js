// Service Worker — Inventário Campus
// Estratégia: Network First — sempre busca versão nova, cache só para offline

const CACHE = 'inventario-v1';

self.addEventListener('install', function(e) {
  self.skipWaiting(); // ativa imediatamente sem esperar fechar abas antigas
});

self.addEventListener('activate', function(e) {
  // Limpa caches antigos
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  // Não intercepta Apps Script
  if (e.request.url.indexOf('script.google.com') > -1) return;
  if (e.request.url.indexOf('unpkg.com') > -1) return;

  e.respondWith(
    fetch(e.request)
      .then(function(res) {
        // Salva no cache para uso offline
        var clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return res;
      })
      .catch(function() {
        // Sem rede — usa cache
        return caches.match(e.request);
      })
  );
});
