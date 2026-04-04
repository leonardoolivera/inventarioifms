var deferredInstallPrompt = null;
var swReloading = false;
var UPDATE_URL = window.UPDATE_URL || '/inventarioifms/index.html';

function recarregarSeNecessario() {
  if (swReloading) return;
  swReloading = true;
  window.location.reload(true);
}

function registerServiceWorkerUpdates() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/inventarioifms/sw.js').then(function(reg) {
    reg.addEventListener('updatefound', function() {
      var novaSW = reg.installing;
      if (!novaSW) return;
      novaSW.addEventListener('statechange', function() {
        if (novaSW.state === 'activated') recarregarSeNecessario();
      });
    });

    reg.update();
    setInterval(function() { reg.update(); }, 2 * 60 * 1000);

    if (reg.active) {
      reg.active.postMessage({ type: 'GET_VERSION' });
    }
  }).catch(function(e) {
    console.warn('SW register error:', e);
  });

  navigator.serviceWorker.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'SW_ACTIVATED') recarregarSeNecessario();
  });

  navigator.serviceWorker.addEventListener('controllerchange', function() {
    recarregarSeNecessario();
  });
}

function checkForUpdate() {
  fetch(UPDATE_URL + '?nocache=' + Date.now(), { cache: 'no-store' })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var match = html.match(/APP_VERSION[^'"]*['"]([^'"]+)['"]/);
      if (!match) return;

      var remoteVersion = match[1];
      var localVersion = APP_VERSION;
      if (remoteVersion === localVersion) return;

      var msg1 = 'Nova versao ' + remoteVersion + ' disponivel';
      var msg2 = 'Voce esta na ' + localVersion + ' · Toque para atualizar';
      document.getElementById('updateTitle').textContent = msg1;
      document.getElementById('updateSub').textContent = msg2;
      document.getElementById('updateBanner').classList.add('show');

      var bl = document.getElementById('updateBannerLogin');
      if (bl) {
        bl.style.display = 'flex';
        document.getElementById('updateTitleLogin').textContent = msg1;
        document.getElementById('updateSubLogin').textContent = msg2;
      }
    })
    .catch(function() {});
}

function recarregarApp() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(regs) {
      regs.forEach(function(reg) { reg.unregister(); });
      window.location.reload(true);
    });
  } else {
    window.location.reload(true);
  }
}

function doUpdate() {
  var pendentes = state.pendingSync.length;
  if (pendentes > 0) {
    showToast('ok', 'Atualizando e sincronizando ' + pendentes + ' itens...', 'Aguarde para recarregar');
    syncNow().finally(function() { recarregarApp(); });
  } else {
    recarregarApp();
  }
}

function doInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(function(choice) {
    if (choice.outcome === 'accepted') {
      document.getElementById('installBanner').classList.remove('show');
    }
    deferredInstallPrompt = null;
  });
}

function dismissInstall() {
  document.getElementById('installBanner').classList.remove('show');
  localStorage.setItem('installDismissed', '1');
}

function bindInstallPrompt() {
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (!localStorage.getItem('installDismissed')) {
      document.getElementById('installBanner').classList.add('show');
    }
  });

  window.addEventListener('appinstalled', function() {
    document.getElementById('installBanner').classList.remove('show');
    deferredInstallPrompt = null;
    setTimeout(function() {
      if (!window.matchMedia('(display-mode: standalone)').matches && !window.navigator.standalone) {
        showToast('ok', 'App instalado!', 'Procure o icone na tela inicial do celular');
      }
    }, 500);
  });
}

function detectStandaloneWelcome() {
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    var primeiraVez = !localStorage.getItem('appAberto');
    if (primeiraVez) {
      localStorage.setItem('appAberto', '1');
      window._mostrarBoasVindas = true;
    }
  }
}

registerServiceWorkerUpdates();
bindInstallPrompt();
detectStandaloneWelcome();
