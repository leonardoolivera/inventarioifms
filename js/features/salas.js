function abreviarSala(nome) {
  if (SALA_MAP[nome]) return SALA_MAP[nome];
  var ab = String(nome || '');
  var bloco = '';
  var pi = ab.indexOf('(');
  var pf = ab.lastIndexOf(')');
  if (pi > -1 && pf > pi) {
    bloco = ab.slice(pi + 1, pf);
    ab = ab.slice(0, pi).trim();
  }
  return { curto: ab, bloco: bloco, emoji: '📦' };
}

function saveRoomPrefs() {
  localStorage.setItem('pinnedRooms', JSON.stringify(state.pinnedRooms));
  localStorage.setItem('hiddenRooms', JSON.stringify(state.hiddenRooms));
}

function togglePin(r, e) {
  if (e) e.stopPropagation();
  var idx = state.pinnedRooms.indexOf(r);
  if (idx > -1) state.pinnedRooms.splice(idx, 1);
  else state.pinnedRooms.unshift(r);
  saveRoomPrefs();
  renderRoomList(document.getElementById('roomSearch') ? document.getElementById('roomSearch').value : '');
}

function ocultarSalaBtn(btn) {
  ocultarSala(btn.getAttribute('data-sala'));
}

function desocultarBtn(btn) {
  desocultar(btn.getAttribute('data-sala'));
}

function ocultarSala(r, e) {
  if (e) e.stopPropagation();
  if (!confirm('Ocultar "' + abreviarSala(r).curto + '"?\nVocê poderá reativar em Configurações.')) return;
  if (state.hiddenRooms.indexOf(r) === -1) state.hiddenRooms.push(r);
  var pi = state.pinnedRooms.indexOf(r);
  if (pi > -1) state.pinnedRooms.splice(pi, 1);
  saveRoomPrefs();
  renderRoomList('');
}

function revelarTodasSalas() {
  state.hiddenRooms = [];
  state.pinnedRooms = [];
  localStorage.setItem('hiddenRooms', '[]');
  localStorage.setItem('pinnedRooms', '[]');
  var emptyDiv = document.getElementById('roomListEmpty');
  if (emptyDiv) emptyDiv.style.display = 'none';
  renderSettRooms();
  renderRoomList();
  showToast('ok', '👁 Todas as salas reveladas', '');
}

function desocultar(r) {
  var idx = state.hiddenRooms.indexOf(r);
  if (idx > -1) state.hiddenRooms.splice(idx, 1);
  saveRoomPrefs();
  renderSettRooms();
}

function roomItemHTML(r) {
  var cnt = state.scans.filter(function(s) { return s.room === r; }).length;
  var ab = abreviarSala(r);
  var sel = state.currentRoom === r;
  var emoji = ab.emoji || '📍';
  var isPinned = state.pinnedRooms.indexOf(r) > -1;
  var modoComp = window._modoComparacao;
  return '<div style="display:flex;align-items:center">'
    + '<div class="room-item' + (sel ? ' selected' : '') + '" onclick="selectRoom(\'' + escJ(r) + '\')" style="flex:1">'
    + '<span class="ri-icon">' + emoji + '</span>'
    + '<div class="ri-info">'
    + '<div class="ri-name">' + esc(ab.curto) + '</div>'
    + '<div class="ri-count">' + (cnt ? cnt + ' itens escaneados' : 'Nenhum scan') + '</div>'
    + '</div>'
    + '<span class="ri-check">&#10003;</span>'
    + '</div>'
    + (!modoComp
      ? '<button class="room-pin-btn' + (isPinned ? ' pinned' : '') + '" onclick="togglePin(\'' + escJ(r) + '\',event)" title="' + (isPinned ? 'Desafixar' : 'Fixar no topo') + '">' + (isPinned ? '📌' : '📍') + '</button>'
      : '')
    + '</div>';
}

function renderRoomList(filtro) {
  var el = document.getElementById('roomList');
  filtro = (filtro || '').toLowerCase().trim();

  var visiveis = state.rooms.filter(function(r) {
    return state.hiddenRooms.indexOf(r) === -1;
  });

  var emptyDiv = document.getElementById('roomListEmpty');
  if (!visiveis.length && state.rooms.length) {
    if (emptyDiv) emptyDiv.style.display = 'block';
    el.innerHTML = '';
    return;
  }
  if (emptyDiv) emptyDiv.style.display = 'none';

  if (filtro) {
    var resultados = visiveis.filter(function(r) {
      var ab = abreviarSala(r);
      return ab.curto.toLowerCase().indexOf(filtro) > -1
        || (ab.bloco && ab.bloco.toLowerCase().indexOf(filtro) > -1)
        || r.toLowerCase().indexOf(filtro) > -1;
    });
    if (!resultados.length) {
      el.innerHTML = '<div class="empty" style="padding:24px">Nenhuma sala encontrada</div>';
      return;
    }
    el.innerHTML = resultados.map(function(r) { return roomItemHTML(r); }).join('');
    return;
  }

  var pinned = state.pinnedRooms.filter(function(r) { return state.hiddenRooms.indexOf(r) === -1; });
  var normais = visiveis.filter(function(r) { return state.pinnedRooms.indexOf(r) === -1; });

  var html = '';

  if (pinned.length) {
    html += '<div class="room-group room-group-pin">'
      + '<div class="room-group-header" onclick="toggleGroup(this)">'
      + '<span class="room-group-title">📌 Fixadas</span>'
      + '<span class="room-group-chevron open">›</span>'
      + '</div>'
      + '<div class="room-group-items open">'
      + pinned.map(function(r) { return roomItemHTML(r); }).join('')
      + '</div></div>';
  }

  var porGrupo = {};
  normais.forEach(function(r) {
    var ab = abreviarSala(r);
    var g = ab.bloco || 'Outros';
    if (!porGrupo[g]) porGrupo[g] = [];
    porGrupo[g].push(r);
  });

  var ordem = ['Bloco A', 'Bloco B', 'Bloco C', 'Salas Modulares', 'Área Externa', 'Outros'];
  ordem.forEach(function(grupo) {
    if (!porGrupo[grupo]) return;
    html += '<div class="room-group">'
      + '<div class="room-group-header" onclick="toggleGroup(this)">'
      + '<span class="room-group-title">' + esc(grupo) + '</span>'
      + '<span class="room-group-chevron open">›</span>'
      + '</div>'
      + '<div class="room-group-items open">'
      + porGrupo[grupo].map(function(r) { return roomItemHTML(r); }).join('')
      + '</div></div>';
  });

  el.innerHTML = html;
}

function renderSettRooms() {
  var el = document.getElementById('settRoomList');
  if (!el) return;
  var visiveis = state.rooms.filter(function(r) { return state.hiddenRooms.indexOf(r) === -1; });
  var ocultas = state.hiddenRooms.filter(function(r) { return state.rooms.indexOf(r) > -1; });

  var html = visiveis.map(function(r, i) {
    var ab = abreviarSala(r);
    return '<div class="sett-item"><span class="si-icon">' + (ab.emoji || roomIcon(i)) + '</span>'
      + '<div class="si-info"><div class="si-title">' + esc(ab.curto) + '</div>'
      + (ab.bloco ? '<div class="si-sub">' + esc(ab.bloco) + '</div>' : '') + '</div>'
      + '<button data-sala="' + escJ(r) + '" onclick="ocultarSalaBtn(this)" style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 10px;color:var(--text2);font-size:11px;cursor:pointer">Ocultar</button>'
      + '</div>';
  }).join('');

  if (ocultas.length) {
    html += '<div class="hidden-rooms-section">'
      + '<div class="sett-title" style="margin-top:8px">&#128584; Salas ocultas (só para você)</div>';
    html += ocultas.map(function(r) {
      var ab = abreviarSala(r);
      return '<div class="hidden-room-item">'
        + '<span style="font-size:18px">' + (ab.emoji || '&#128205;') + '</span>'
        + '<span class="hidden-room-name">' + esc(ab.curto) + '</span>'
        + '<button class="unhide-btn" data-sala="' + escJ(r) + '" onclick="desocultarBtn(this)">Reativar</button>'
        + '</div>';
    }).join('');
    html += '</div>';
  }

  el.innerHTML = html;
  var btnRevelar = document.getElementById('btnRevelarSalas');
  if (btnRevelar) btnRevelar.style.display = ocultas.length ? 'block' : 'none';
}

function renderMinhasSalas() {
  var meusScans = state.scans.filter(function(s) { return s.type === 'scan'; });
  var meusNopat = state.scans.filter(function(s) { return s.type === 'nopat'; });

  document.getElementById('msTotal').textContent = meusScans.length;
  document.getElementById('msNopat').textContent = meusNopat.length;

  var porSala = {};
  meusScans.forEach(function(s) {
    if (!porSala[s.room]) porSala[s.room] = 0;
    porSala[s.room]++;
  });
  var salasVisitadas = Object.keys(porSala);
  document.getElementById('msSalas').textContent = salasVisitadas.length;

  var elVisit = document.getElementById('msSalasVisitadas');
  var elNaoVis = document.getElementById('msSalasNaoVisitadas');

  if (!salasVisitadas.length) {
    elVisit.innerHTML = '<div class="empty" style="padding:24px 0"><div class="empty-ico">📭</div>Você ainda não escaneou nenhuma sala</div>';
    elNaoVis.innerHTML = '';
    return;
  }

  salasVisitadas.sort(function(a, b) { return porSala[b] - porSala[a]; });

  var visitHtml = '<div class="ms-section-label">Salas que você visitou</div>';
  salasVisitadas.forEach(function(sala) {
    var ab = abreviarSala(sala);
    var feitos = porSala[sala];
    var total = suapTotais ? (suapTotais[sala] || 0) : 0;
    var pct = total > 0 ? Math.min(100, Math.round(feitos / total * 100)) : null;
    var cor = pct === null ? 'var(--accent)' : pct >= 90 ? 'var(--green)' : pct >= 50 ? 'var(--accent)' : 'var(--yellow)';
    var countTxt = total > 0 ? feitos + ' / ' + total : feitos + ' itens';
    var subTxt = total > 0
      ? pct + '% · ' + (total - feitos) + ' pendentes' + (pct === 100 ? ' · ✅ Concluído' : '')
      : (ab.bloco || '');

    visitHtml += '<div class="ms-sala-card" onclick="showCampusDetalhe(\'' + escJ(sala) + '\')">'
      + '<div class="ms-sala-header">'
      + '<div class="ms-sala-name">' + (ab.emoji || '📍') + ' ' + esc(ab.curto) + '</div>'
      + '<div class="ms-sala-count" style="color:' + cor + '">' + countTxt + '</div>'
      + '</div>'
      + '<div class="ms-sala-bar-bg"><div class="ms-sala-bar" style="width:' + (pct !== null ? pct : Math.min(100, feitos * 10)) + '%;background:' + cor + '"></div></div>'
      + '<div class="ms-sala-sub">' + esc(subTxt) + '</div>'
      + '</div>';
  });
  elVisit.innerHTML = visitHtml;

  var todasSalas = state.rooms || [];
  var naoVisitadas = todasSalas.filter(function(s) { return !porSala[s]; });
  if (!naoVisitadas.length) {
    elNaoVis.innerHTML = '';
    return;
  }

  naoVisitadas.sort(function(a, b) {
    var ta = suapTotais ? (suapTotais[a] || 0) : 0;
    var tb = suapTotais ? (suapTotais[b] || 0) : 0;
    return tb - ta;
  });

  var naoHtml = '<div class="ms-section-label">Salas não visitadas (' + naoVisitadas.length + ')</div>';
  naoVisitadas.slice(0, 15).forEach(function(sala) {
    var ab = abreviarSala(sala);
    var total = suapTotais ? (suapTotais[sala] || 0) : 0;
    naoHtml += '<div class="ms-nao-item">'
      + '<span style="font-size:14px">' + (ab.emoji || '📍') + '</span>'
      + '<div class="ms-nao-name">' + esc(ab.curto) + (ab.bloco ? ' · ' + esc(ab.bloco) : '') + '</div>'
      + (total ? '<div class="ms-nao-count">' + total + ' itens</div>' : '')
      + '</div>';
  });
  if (naoVisitadas.length > 15) {
    naoHtml += '<div style="font-size:11px;color:var(--text2);text-align:center;padding:8px">+ ' + (naoVisitadas.length - 15) + ' salas</div>';
  }
  elNaoVis.innerHTML = naoHtml;
}

var campusData = null;

function showCampus() {
  showScreen('scCampus');
  if (!campusData) carregarCampus();
  else renderCampus('');
}

function showCampusDetalhe(sala) {
  showScreen('scCampus');
  if (!campusData) {
    carregarCampus(function() { abrirDetalheCampus(sala); });
  } else {
    renderCampus('');
    setTimeout(function() { abrirDetalheCampus(sala); }, 100);
  }
}

function carregarCampus(cb) {
  document.getElementById('campusList').innerHTML = '<div class="empty"><div class="empty-ico">⏳</div>Carregando...</div>';
  getComparacaoSala().then(function(res) {
    if (!res.ok) {
      document.getElementById('campusList').innerHTML = '<div class="empty">⚠️ Erro ao carregar</div>';
      return;
    }
    campusData = res.porSala || {};
    renderCampus('');
    if (cb) cb();
  }).catch(function() {
    document.getElementById('campusList').innerHTML = '<div class="empty">❌ Sem conexão</div>';
  });
}

function filtrarCampus(filtro) {
  renderCampus((filtro || '').toLowerCase().trim());
}

function renderCampus(filtro) {
  if (!campusData) return;
  var todasSalas = state.rooms || [];
  var ordem = ['Bloco A', 'Bloco B', 'Bloco C', 'Salas Modulares', 'Área Externa'];
  var porGrupo = {};
  todasSalas.forEach(function(sala) {
    var ab = abreviarSala(sala);
    var g = ab.bloco || 'Outros';
    if (!porGrupo[g]) porGrupo[g] = [];
    if (!filtro || ab.curto.toLowerCase().indexOf(filtro) > -1 || sala.toLowerCase().indexOf(filtro) > -1) {
      porGrupo[g].push(sala);
    }
  });

  var html = '';
  var totalSalas = 0;

  ordem.concat(['Outros']).forEach(function(grupo) {
    if (!porGrupo[grupo] || !porGrupo[grupo].length) return;
    html += '<div class="campus-group-label">' + esc(grupo) + '</div>';
    porGrupo[grupo].forEach(function(sala) {
      totalSalas++;
      var ab = abreviarSala(sala);
      var itens = campusData[sala] || [];
      var total = suapTotais ? (suapTotais[sala] || 0) : itens.length;
      var enc = itens.filter(function(i) { return i[2] === 'correto' || i[2] === 'outro_local'; }).length;
      var pct = total > 0 ? Math.min(100, Math.round(enc / total * 100)) : 0;
      var cor = pct >= 90 ? 'var(--green)' : pct >= 50 ? 'var(--accent)' : 'var(--yellow)';
      var foot = total > 0 ? enc + ' / ' + total + (pct === 100 ? ' · ✅' : ' · ' + (total - enc) + ' pendentes') : 'Sem dados SUAP';
      html += '<div class="campus-sala-card" id="ccard-' + encodeURIComponent(sala) + '" onclick="toggleCampusSala(\'' + escJ(sala) + '\',this)">'
        + '<div class="campus-sala-header">'
        + '<div class="campus-sala-emoji">' + (ab.emoji || '📍') + '</div>'
        + '<div class="campus-sala-info"><div class="campus-sala-name">' + esc(ab.curto) + '</div>'
        + (ab.bloco ? '<div class="campus-sala-bloco">' + esc(ab.bloco) + '</div>' : '')
        + '</div>'
        + '<div class="campus-sala-pct" style="color:' + cor + '">' + pct + '%</div>'
        + '</div>'
        + '<div class="campus-sala-bar-bg"><div class="campus-sala-bar" style="width:' + pct + '%;background:' + cor + '"></div></div>'
        + '<div class="campus-sala-foot">' + esc(foot) + '</div>'
        + '</div>';
    });
  });

  if (!totalSalas) {
    html = '<div class="empty" style="padding:32px 0"><div class="empty-ico">🔍</div>Nenhuma sala encontrada</div>';
  }

  document.getElementById('campusList').innerHTML = html;
  document.getElementById('campusSub').textContent = totalSalas + ' salas · ' + (Object.keys(campusData).length ? Object.keys(campusData).length + ' com dados' : 'Carregando dados...');
}

function toggleCampusSala(sala, card) {
  var isOpen = card.classList.contains('open');
  document.querySelectorAll('.campus-sala-card.open').forEach(function(c) {
    c.classList.remove('open');
    var d = c.querySelector('.campus-detail');
    if (d) d.remove();
  });
  if (isOpen) return;
  card.classList.add('open');
  abrirDetalheCampus(sala, card);
}

function abrirDetalheCampus(sala, card) {
  if (!card) card = document.getElementById('ccard-' + encodeURIComponent(sala));
  if (!card) return;
  card.classList.add('open');

  var itens = campusData ? (campusData[sala] || []) : [];
  if (!itens.length) {
    card.insertAdjacentHTML('beforeend', '<div class="campus-detail"><div style="font-size:12px;color:var(--text2);text-align:center">Nenhum item registrado</div></div>');
    return;
  }

  var icons = { correto: '✅', outro_local: '🟡', nao_localizado: '❌', pendente: '⏳' };
  var mostrar = itens.slice(0, 8);
  var detailHtml = '<div class="campus-detail">'
    + mostrar.map(function(it) {
      return '<div class="campus-detail-row">'
        + '<div class="campus-detail-num">' + esc(it[0]) + '</div>'
        + '<div class="campus-detail-desc">' + esc(it[1]) + '</div>'
        + '<div class="campus-detail-status">' + (icons[it[2]] || '•') + '</div>'
        + '</div>';
    }).join('')
    + (itens.length > 8 ? '<div style="font-size:10px;color:var(--text2);text-align:center;padding-top:6px">+ ' + (itens.length - 8) + ' itens</div>' : '')
    + '</div>';
  card.insertAdjacentHTML('beforeend', detailHtml);
}

var suapTotais = null;
var suapEncontrados = null;
var suapCarregando = false;

function carregarTotaisSUAP(callback) {
  if (suapTotais) {
    callback();
    return;
  }
  if (suapCarregando) {
    setTimeout(function() { carregarTotaisSUAP(callback); }, 500);
    return;
  }
  suapCarregando = true;
  getTotalPorSala()
    .then(function(res) {
      if (res.ok && res.salas) {
        suapTotais = {};
        suapEncontrados = {};
        res.salas.forEach(function(s) {
          suapTotais[s.sala_suap] = s.total;
          suapEncontrados[s.sala_suap] = (s.correto || 0) + (s.outro_local || 0);
        });
      }
    })
    .catch(function() {})
    .finally(function() {
      suapCarregando = false;
      renderHomeSummary();
      callback();
    });
}

function showProgress() {
  showMinhasSalas();
}
