function updateHomeStatus() {
  var badge = document.getElementById('homeStatusBadge');
  var textEl = document.getElementById('homeStatusText');
  if (!badge || !textEl) return;

  var online = !!state.isOnline;
  badge.classList.toggle('offline', !online);
  textEl.textContent = online ? 'Online' : 'Offline';
}

function getHomeSummary() {
  var scans = state.scans.filter(function(scan) {
    return scan.type === 'scan';
  }).length;

  var porSala = {};
  state.scans.forEach(function(scan) {
    if (scan.type !== 'scan' || !scan.room) return;
    porSala[scan.room] = (porSala[scan.room] || 0) + 1;
  });

  var totalSalas = state.rooms.length;
  var salasConcluidas = Object.keys(porSala).length;
  var progresso = 0;

  if (suapTotais && Object.keys(suapTotais).length) {
    var totalBens = 0;
    totalSalas = Object.keys(suapTotais).length;
    salasConcluidas = 0;

    Object.keys(suapTotais).forEach(function(sala) {
      var totalSala = suapTotais[sala] || 0;
      var feitosSala = Math.max((porSala[sala] || 0), (suapEncontrados && suapEncontrados[sala]) || 0);

      totalBens += totalSala;
      if (totalSala > 0 && feitosSala >= totalSala) salasConcluidas++;
    });

    progresso = totalBens > 0
      ? Math.min(100, Math.round((scans / totalBens) * 100))
      : 0;
  } else if (totalSalas > 0) {
    progresso = Math.min(100, Math.round((salasConcluidas / totalSalas) * 100));
  }

  return {
    salasConcluidas: salasConcluidas,
    totalSalas: totalSalas,
    bensEscaneados: scans,
    progresso: progresso
  };
}

function renderHomeSummary() {
  var resumo = getHomeSummary();
  var roomsDone = document.getElementById('homeRoomsDone');
  var roomsTotal = document.getElementById('homeRoomsTotal');
  var assets = document.getElementById('homeAssetsTotal');
  var pct = document.getElementById('homeProgressPct');
  var fill = document.getElementById('homeProgressFill');
  var textEl = document.getElementById('homeProgressText');

  if (!roomsDone || !roomsTotal || !assets || !pct || !fill) return;

  roomsDone.textContent = resumo.salasConcluidas;
  roomsTotal.textContent = resumo.totalSalas;
  assets.textContent = resumo.bensEscaneados;
  pct.textContent = resumo.progresso + '%';
  fill.style.width = resumo.progresso + '%';
  if (textEl) textEl.textContent = resumo.progresso + '% concluido';
}

window.updateHomeStatus = updateHomeStatus;
window.getHomeSummary = getHomeSummary;
window.renderHomeSummary = renderHomeSummary;
