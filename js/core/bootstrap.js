function applyVersionLabels() {
  ['versionFooter', 'versionBadge', 'versionSettings'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = el.id === 'versionFooter'
      ? APP_VERSION + ' | Censo'
      : APP_VERSION;
  });

  var loginVersion = document.getElementById('versionLogin');
  if (loginVersion) loginVersion.textContent = APP_VERSION + ' | Censo';
}

function bindConnectivityEvents() {
  window.addEventListener('online', function() {
    state.isOnline = true;
    updateSyncBanner();
    updateHomeStatus();
    syncNow();
  });

  window.addEventListener('offline', function() {
    state.isOnline = false;
    updateSyncBanner();
    updateHomeStatus();
  });
}

function scheduleBackgroundTasks() {
  if (state.isOnline && state.pendingSync.length) {
    setTimeout(syncNow, 2000);
  }

  setInterval(function() {
    if (state.isOnline && state.pendingSync.length) syncNow();
  }, 30000);

  if (window._mostrarBoasVindas) {
    setTimeout(function() {
      showToast('ok', 'App instalado com sucesso!', 'Bem-vindo ao Censo');
    }, 1500);
  }

  setTimeout(function() {
    if (state.isOnline) checkForUpdate();
  }, 3000);

  setInterval(function() {
    if (state.isOnline) checkForUpdate();
  }, 5 * 60 * 1000);
}

function bootstrapAppUI() {
  updateHomeStatus();
  updateRoomLabel();
  updateStats();
  updateSyncBanner();
  renderRoomList();
  renderHistList();
  renderSettRooms();
  loadScriptUrl();
  loadGeminiKey();
  applyVersionLabels();
  bindConnectivityEvents();
  scheduleBackgroundTasks();
}
