var compCache = null;
var compSalaAtual = '';

function histBtn(btn) {
  showRoomHistory(btn.getAttribute('data-sala'));
}

function abrirSelecaoComparacao() {
  compSalaAtual = '';
  window._modoComparacao = true;
  showScreen('scRooms');

  var title = document.querySelector('#scRooms .topbar-title');
  if (title) title.textContent = 'Selecionar sala';

  var sub = document.querySelector('#scRooms .topbar-sub');
  if (sub) sub.textContent = 'Toque para ver a comparação';
}

function abrirComparacao(sala) {
  compSalaAtual = sala;
  var ab = abreviarSala(sala);
  document.getElementById('compTitle').textContent = ab.curto || sala;
  document.getElementById('compSub').textContent = ab.bloco || '';
  showScreen('scComparacao');

  if (compCache) {
    mostrarCompSala(sala);
    return;
  }

  document.getElementById('compList').innerHTML = '<div class="empty"><div class="empty-ico">⏳</div>Carregando dados...</div>';
  document.getElementById('compCorreto').textContent = '—';
  document.getElementById('compOutro').textContent = '—';
  document.getElementById('compNao').textContent = '—';
  document.getElementById('compPend').textContent = '—';

  getComparacaoSala()
    .then(function(res) {
      if (!res.ok) {
        document.getElementById('compList').innerHTML = '<div class="empty">⚠️ ' + (res.erro || 'Erro ao carregar') + '</div>';
        return;
      }
      compCache = res.porSala || {};
      mostrarCompSala(compSalaAtual);
    })
    .catch(function() {
      document.getElementById('compList').innerHTML = '<div class="empty">❌ Erro de conexão</div>';
    });
}

function mostrarCompSala(sala) {
  var itensRaw = compCache[sala] || [];
  var stats = { correto: 0, outro_local: 0, nao_localizado: 0, pendente: 0 };
  itensRaw.forEach(function(it) {
    stats[it[2]] = (stats[it[2]] || 0) + 1;
  });

  document.getElementById('compCorreto').textContent = stats.correto || 0;
  document.getElementById('compOutro').textContent = stats.outro_local || 0;
  document.getElementById('compNao').textContent = stats.nao_localizado || 0;
  document.getElementById('compPend').textContent = stats.pendente || 0;

  document.querySelectorAll('.comp-filter-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  document.querySelector('.comp-filter-btn').classList.add('active');
  renderCompList('todos');
}

function filtrarComp(tipo, btn) {
  document.querySelectorAll('.comp-filter-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  btn.classList.add('active');
  renderCompList(tipo);
}

function renderCompList(filtro) {
  if (!compCache) return;

  var itensRaw = compCache[compSalaAtual] || [];
  if (filtro !== 'todos') {
    itensRaw = itensRaw.filter(function(it) {
      return it[2] === filtro;
    });
  }

  if (!itensRaw.length) {
    document.getElementById('compList').innerHTML = '<div class="empty">Nenhum item nesta categoria</div>';
    return;
  }

  var icons = { correto: '✅', outro_local: '🟡', nao_localizado: '❌', pendente: '⏳' };
  document.getElementById('compList').innerHTML = itensRaw.map(function(it) {
    var tipo = it[2];
    var icon = icons[tipo] || '•';
    var meta = '';
    if (tipo === 'outro_local' && it[3]) meta = '📍 ' + esc(it[3]) + (it[4] ? ' · ' + esc(it[4]) : '');
    if (tipo === 'nao_localizado') meta = 'Não encontrado';

    return '<div class="comp-item ' + tipo + '">'
      + '<div style="display:flex;align-items:center;gap:6px">'
      + '<span>' + icon + '</span><span class="comp-item-num">' + esc(it[0]) + '</span>'
      + '</div>'
      + '<div class="comp-item-desc">' + esc(it[1]) + '</div>'
      + (meta ? '<div class="comp-item-meta">' + meta + '</div>' : '')
      + '</div>';
  }).join('');
}

function showRoomHistory(sala) {
  var ab = abreviarSala(sala);
  document.getElementById('roomHistTitle').textContent = ab.curto || sala;

  var itens = state.scans.filter(function(s) {
    return s.room === sala;
  }).slice().reverse();

  document.getElementById('roomHistSub').textContent = itens.length + ' itens escaneados';
  var el = document.getElementById('roomHistList');
  if (!itens.length) {
    el.innerHTML = '<div class="empty"><div class="empty-ico">📭</div>Nenhum item escaneado nesta sala</div>';
  } else {
    el.innerHTML = itens.map(function(s) {
      var icon = s.type === 'nopat' ? '📷' : '🏷️';
      var label = s.type === 'nopat' ? (s.desc || 'Sem patrimônio') : s.code;
      var sync = s.synced ? '☁' : '⏳';
      return '<div class="room-hist-item">'
        + '<span style="font-size:16px">' + icon + '</span>'
        + '<div style="flex:1;min-width:0">'
        + '<div class="room-hist-code">' + esc(label) + '</div>'
        + (s.estado ? '<div class="room-hist-user">' + esc(s.estado) + '</div>' : '')
        + '</div>'
        + '<div style="text-align:right">'
        + '<div class="room-hist-time">' + fmtTime(new Date(s.ts)) + '</div>'
        + '<div class="room-hist-user">' + sync + '</div>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  showScreen('scRoomHist');
}

function mostrarInfoSala(nome) {
  var ab = abreviarSala(nome);
  showToast('ok', esc(ab.curto), ab.bloco ? '📍 ' + esc(ab.bloco) : nome);
}

function showMinhasSalas() {
  var user = currentUser || { nome: 'Servidor', siape: '' };
  document.getElementById('msSalasTitulo').textContent = user.nome.split(' ')[0];
  document.getElementById('msSubtitulo').textContent = 'SIAPE ' + (user.siape || '—');
  renderMinhasSalas();
  showScreen('scMinhasSalas');
}
