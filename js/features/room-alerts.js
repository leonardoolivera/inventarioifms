function mostrarAvisoSala(salaOriginal, idsErrados) {
  var ab = abreviarSala(state.currentRoom);
  var abOrig = abreviarSala(salaOriginal);
  var modal = document.getElementById('wrongRoomModal');
  var msgEl = document.getElementById('wrongRoomMsg');
  if (!modal || !msgEl) return;

  msgEl.innerHTML = '<div style="font-size:28px;margin-bottom:8px">⚠️</div><div style="font-weight:700;font-size:15px;margin-bottom:8px">Você está na sala certa?</div><div style="font-size:13px;color:var(--text2);margin-bottom:4px">Os últimos 3 patrimônios pertencem à <strong style="color:var(--yellow)">' + esc(abOrig.curto) + '</strong>, mas o local é <strong style="color:var(--accent)">' + esc(ab.curto) + '</strong>.</div><div style="font-size:12px;color:var(--text2);margin-top:8px">Deseja trocar para <strong>' + esc(abOrig.curto) + '</strong>?</div>';

  document.getElementById('wrongRoomSugerida').setAttribute('data-sala', salaOriginal);
  document.getElementById('wrongRoomSugerida').setAttribute('data-ids', JSON.stringify(idsErrados || []));
  modal.classList.add('show');

  var btn = document.getElementById('wrongRoomSugerida');
  var cdEl = document.getElementById('wrongRoomCountdown');
  btn.disabled = true;
  btn.style.opacity = '.6';
  var cd = 2;
  cdEl.textContent = cd;
  var cdTimer = setInterval(function() {
    cd--;
    if (cd <= 0) {
      clearInterval(cdTimer);
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.innerHTML = 'Sim, trocar sala';
    } else {
      cdEl.textContent = cd;
    }
  }, 1000);
}

function fecharAvisoSala() {
  document.getElementById('wrongRoomModal').classList.remove('show');
}

function trocarParaSalasSugerida() {
  var btn = document.getElementById('wrongRoomSugerida');
  var sala = btn.getAttribute('data-sala');
  var ids = JSON.parse(btn.getAttribute('data-ids') || '[]');
  fecharAvisoSala();

  if (!sala) return;

  selectRoom(sala);
  if (ids.length > 0 && confirm('Corrigir os ultimos ' + ids.length + ' patrimonios para ' + abreviarSala(sala).curto + '? Isso vai atualizar a sala deles na planilha.')) {
    corrigirSalaScans(ids, sala);
  } else {
    showToast('ok', '📍 Sala alterada', abreviarSala(sala).curto);
  }
}

function corrigirSalaScans(ids, novaSala) {
  ids.forEach(function(id) {
    var scan = state.scans.find(function(s) { return s.id === id; });
    if (scan) scan.room = novaSala;
  });

  saveScans();
  updateStats();
  renderHistList();

  showToast('ok', '✅ Corrigindo ' + ids.length + ' itens...', 'Sala: ' + abreviarSala(novaSala).curto);

  if (!state.isOnline) return;

  corrigirSala(ids, novaSala)
    .then(function(res) {
      if (res.ok) {
        showToast('ok', '✅ ' + ids.length + ' itens corrigidos na planilha', abreviarSala(novaSala).curto);
        compCache = null;
      } else {
        showToast('dup', '⚠️ Erro ao corrigir na planilha', 'Tente sincronizar manualmente');
      }
    })
    .catch(function() {
      showToast('dup', '⚠️ Sem conexão', 'Correção ficou só local');
    });
}
