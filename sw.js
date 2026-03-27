// Service Worker — Inventário Campus
// Muda o CACHE_NAME para forçar atualização em todos os dispositivos
const CACHE_NAME = 'inventario-v4.5';

self.addEventListener('install', function(e) {
  // Ativa imediatamente sem esperar fechar abas antigas
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  // Deleta TODOS os caches antigos ao ativar
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) {
              console.log('SW: deletando cache antigo', k);
              return caches.delete(k);
            })
      );
    }).then(function() {
      // Toma controle de todas as abas imediatamente
      return self.clients.claim();
    }).then(function() {
      // Avisa todas as abas que há uma atualização
      return self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      });
    })
  );
});

self.addEventListener('fetch', function(e) {
  // Não intercepta chamadas externas
  if (e.request.url.indexOf('script.google.com') > -1) return;
  if (e.request.url.indexOf('googleapis.com') > -1) return;
  if (e.request.url.indexOf('unpkg.com') > -1) return;
  if (e.request.url.indexOf('fonts.googleapis.com') > -1) return;

  // Network first — sempre busca versão nova, cache só para offline
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(function(res) {
        // Salva no cache para uso offline
        if (res.ok) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      })
      .catch(function() {
        // Sem rede — usa cache
        return caches.match(e.request);
      })
  );
});
