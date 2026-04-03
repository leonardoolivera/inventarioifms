window.syncTimer = window.syncTimer || null;
window.syncRunning = window.syncRunning || false;
window.syncRunningTs = window.syncRunningTs || 0;

function addToPendingSync(entry) {
  if (state.pendingSync.indexOf(entry.id) === -1) {
    state.pendingSync.push(entry.id);
    localStorage.setItem('pendingSync', JSON.stringify(state.pendingSync));
  }
  updateSyncBanner();
  if (state.isOnline) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, 2000);
  }
}

function syncNow() {
  if (!state.isOnline || !state.pendingSync.length) {
    return Promise.resolve({ ok: false, skipped: true });
  }
  if (syncRunning && (Date.now() - syncRunningTs) < 30000) {
    return Promise.resolve({ ok: false, skipped: true, reason: 'running' });
  }

  syncRunning = true;
  syncRunningTs = Date.now();

  var toSync = state.scans.filter(function(s) { return state.pendingSync.indexOf(s.id) > -1; });
  if (!toSync.length) {
    syncRunning = false;
    return Promise.resolve({ ok: false, skipped: true, reason: 'empty' });
  }

  setSyncState('syncing');

  var nopats = toSync.filter(function(s) { return s.type === 'nopat' && !photoCache[s.id]; });
  return Promise.all(nopats.map(function(s) {
    return idbCarregarFoto(s.id).then(function(foto) {
      if (foto) photoCache[s.id] = foto;
    });
  })).then(function() {
    var items = toSync.map(function(s) {
      var foto = (s.type === 'nopat' && photoCache[s.id]) ? photoCache[s.id] : (s.photo || '');
      return {
        id: s.id,
        type: s.type,
        code: s.code || '',
        room: s.room || '',
        desc: s.desc || '',
        estado: s.estado || '',
        photo: foto,
        ts: s.ts,
        funcionario: s.funcionario || '',
        siape: s.siape || ''
      };
    });

    var loteSize = 10;
    var lotes = [];
    for (var i = 0; i < items.length; i += loteSize) {
      lotes.push(items.slice(i, i + loteSize));
    }

    var sincronizados = [];
    var falhas = [];

    function finalizar() {
      sincronizados.forEach(function(id) {
        var scan = state.scans.find(function(s) { return s.id === id; });
        if (scan) {
          scan.synced = true;
          delete photoCache[scan.id];
          idbDeletarFoto(scan.id);
        }
        var pi = state.pendingSync.indexOf(id);
        if (pi > -1) state.pendingSync.splice(pi, 1);
      });

      saveScans();
      localStorage.setItem('pendingSync', JSON.stringify(state.pendingSync));
      renderHistList();
      updateSyncBanner();
      syncRunning = false;

      if (falhas.length === 0) {
        if (sincronizados.length > 0) sincronizarPlanilha(false);
        return { ok: true, sincronizados: sincronizados.length };
      }

      setTimeout(syncNow, 10000);
      return { ok: false, sincronizados: sincronizados.length, falhas: falhas.length };
    }

    function enviarLote(idx) {
      if (idx >= lotes.length) return Promise.resolve(finalizar());
      var lote = lotes[idx];
      return batchSync(lote)
        .then(function(res) {
          if (res.ok) {
            lote.forEach(function(item) { sincronizados.push(item.id); });
          } else {
            lote.forEach(function(item) { falhas.push(item.id); });
            console.error('Lote falhou:', res.erro);
          }
          return enviarLote(idx + 1);
        })
        .catch(function(e) {
          lote.forEach(function(item) { falhas.push(item.id); });
          console.error('Lote erro:', e);
          return enviarLote(idx + 1);
        });
    }

    return enviarLote(0);
  }).catch(function(err) {
    syncRunning = false;
    updateSyncBanner();
    return { ok: false, erro: String(err) };
  });
}

function setSyncState(state_) {
  var dot = document.getElementById('syncDot');
  var text = document.getElementById('syncText');
  var cnt = document.getElementById('syncCount');
  var banner = document.getElementById('offlineBanner');
  var userInline = document.getElementById('userSyncInline');
  var userText = document.getElementById('userSyncText');
  var n = state.pendingSync.length;

  if (dot) dot.className = 'sync-dot ' + state_;
  if (userInline) userInline.className = 'user-sync-inline ' + state_;

  if (state_ === 'online') {
    if (text) text.textContent = 'Conectado · tudo sincronizado';
    if (cnt) cnt.textContent = '';
    if (userText) userText.textContent = 'Conectado';
    if (banner) banner.classList.remove('show');
  }
  if (state_ === 'pending') {
    if (text) text.textContent = 'Pendente · aguardando sincronizacao';
    if (cnt) cnt.textContent = n ? n + ' pendentes' : '';
    if (userText) userText.textContent = 'Pendente (' + n + ' item' + (n === 1 ? '' : 's') + ')';
    if (banner) banner.classList.remove('show');
  }
  if (state_ === 'offline') {
    if (text) text.textContent = 'Sem conexao · dados salvos localmente';
    if (cnt) cnt.textContent = n ? n + ' pendentes' : '';
    if (userText) userText.textContent = 'Offline';
    if (banner && n > 0) banner.classList.add('show');
  }
  if (state_ === 'syncing') {
    if (text) text.textContent = 'Sincronizando...';
    if (cnt) cnt.textContent = '';
    if (userText) userText.textContent = 'Sincronizando';
    if (banner) banner.classList.remove('show');
  }
}

function updateSyncBanner() {
  var n = state.pendingSync.length;
  if (!state.isOnline) {
    setSyncState('offline');
  } else if (n) {
    setSyncState('pending');
  } else {
    setSyncState('online');
  }
}

function updateStats() {
  renderHomeSummary();
}

function saveScans() {
  var semFoto = state.scans.map(function(s) {
    if (s.type !== 'nopat' || !s.photo) return s;
    var copia = JSON.parse(JSON.stringify(s));
    copia.photo = s.synced ? '' : '__PENDENTE__';
    return copia;
  });

  try {
    localStorage.setItem('scans', JSON.stringify(semFoto));
  } catch (e) {
    state.scans = state.scans.filter(function(s) { return !s.synced; });
    localStorage.setItem('scans', JSON.stringify(semFoto.filter(function(s) { return !s.synced; })));
  }
}
