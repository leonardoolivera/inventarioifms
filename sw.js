var CACHE_NAME = 'inventario-v6.3';

self.addEventListener('install', function(e) {
  // Ativa imediatamente sem esperar fechar abas
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      // Toma controle de todas as abas imediatamente
      return self.clients.claim();
    }).then(function() {
      // Avisa todas as abas para recarregar
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_NAME });
        });
      });
    })
  );
});

self.addEventListener('fetch', function(e) {
  // Não intercepta APIs externas
  if (e.request.url.indexOf('script.google.com') > -1) return;
  if (e.request.url.indexOf('googleapis.com') > -1) return;
  if (e.request.url.indexOf('unpkg.com') > -1) return;
  if (e.request.url.indexOf('fonts.googleapis.com') > -1) return;
  if (e.request.url.indexOf('cdnjs.cloudflare.com') > -1) return;

  // Network first — sempre tenta buscar versão nova
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(function(res) {
        if (res.ok) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      })
      .catch(function() {
        // Offline — usa cache
        return caches.match(e.request);
      })
  );
});
