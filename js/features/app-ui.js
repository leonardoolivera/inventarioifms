var suapTotais = null;
var suapEncontrados = null;
var suapCarregando = false;

function showUndoBar(code, room) {
  clearTimeout(undoTimer);
  clearInterval(undoProgTimer);
  document.getElementById('undoCode').textContent = '✅ ' + code;
  document.getElementById('undoSub').textContent = '📍 ' + room + ' · toque para desfazer';
  var bar = document.getElementById('undoBar');
  var prog = document.getElementById('undoProg');
  prog.style.transition = 'none';
  prog.style.width = '100%';
  bar.classList.add('show');

  setTimeout(function() {
    prog.style.transition = 'width ' + UNDO_SECS + 's linear';
    prog.style.width = '0%';
  }, 50);

  undoTimer = setTimeout(function() {
    hideUndoBar();
  }, UNDO_SECS * 1000);
}

function hideUndoBar() {
  clearTimeout(undoTimer);
  document.getElementById('undoBar').classList.remove('show');
  lastEntry = null;
}

function undoLast() {
  if (!lastEntry) return;
  var id = lastEntry.id;
  state.scans = state.scans.filter(function(s) { return s.id !== id; });
  state.pendingSync = state.pendingSync.filter(function(i) { return i !== id; });
  saveScans();
  localStorage.setItem('pendingSync', JSON.stringify(state.pendingSync));
  updateStats();
  renderHistList();
  updateSyncBanner();
  hideUndoBar();
  showToast('warn', '↩ Desfeito', 'Código removido do histórico');
  if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
}

function setActionBusy(el, busy, subText) {
  if (!el) return;
  el.classList.toggle('busy', !!busy);

  if (el.tagName === 'BUTTON') {
    el.disabled = !!busy;
    if (busy) {
      if (!el.dataset.originalHtml) el.dataset.originalHtml = el.innerHTML;
      el.innerHTML = '<span class="spin"></span>' + (subText || 'Processando...');
    } else if (el.dataset.originalHtml) {
      el.innerHTML = el.dataset.originalHtml;
    }
    return;
  }

  var arrow = el.querySelector('.si-arrow');
  if (arrow) {
    if (busy) {
      if (!arrow.dataset.originalHtml) arrow.dataset.originalHtml = arrow.innerHTML;
      arrow.innerHTML = '<span class="spin" style="width:14px;height:14px;border-top-color:var(--accent);border-color:rgba(79,140,255,.25);margin-right:0"></span>';
    } else if (arrow.dataset.originalHtml) {
      arrow.innerHTML = arrow.dataset.originalHtml;
    }
  }

  var sub = el.querySelector('.si-sub');
  if (sub && subText) {
    if (busy) {
      if (!sub.dataset.originalText) sub.dataset.originalText = sub.textContent;
      sub.textContent = subText;
    } else if (sub.dataset.originalText) {
      sub.textContent = sub.dataset.originalText;
    }
  }
}

function withActionFeedback(el, subText, work) {
  setActionBusy(el, true, subText);
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      Promise.resolve()
        .then(work)
        .then(resolve)
        .catch(reject)
        .finally(function() {
          setActionBusy(el, false);
        });
    }, 40);
  });
}

function testConnection(el) {
  return withActionFeedback(el, 'Testando conexao...', function() {
    return testConnectionSupabase()
      .then(function() {
        updateSyncBanner();
        showToast('ok', 'Supabase conectado!', 'Banco de dados OK');
      })
      .catch(function(e) {
        showToast('warn', 'Erro de conexao', e.toString());
      });
  });
}

function showToast(type, title, sub) {
  var el = document.getElementById('toast');
  document.getElementById('toastIco').textContent = type === 'ok' ? '✅' : type === 'warn' ? '⚠️' : '🔁';
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastSub').textContent = sub || '';
  el.className = 'result-toast ' + type + ' show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() {
    el.classList.remove('show');
  }, 2800);
}

function flashScan(type) {
  var el = document.getElementById('scanFlash');
  el.className = 'scan-flash ' + type + ' show';
  setTimeout(function() {
    el.classList.remove('show');
  }, 300);
}

function saveScriptUrl() {
  configurarPlanilhaUrl();
}

function loadScriptUrl() {
  return state.scriptUrl || '';
}

function salvarScriptUrl() {
  configurarPlanilhaUrl();
}

var SHEETS_TOKEN = 'inv-ifms-2394174';

function testarPlanilha(el) {
  return withActionFeedback(el, 'Testando integracao...', function() {
    if (!state.scriptUrl) {
      showToast('warn', 'URL nao configurada', 'Cole a URL do Apps Script primeiro');
      return;
    }
    return fetch(state.scriptUrl + '?action=ping', { mode: 'no-cors' })
      .then(function() {
        showToast('ok', 'Planilha acessivel', 'Conexao OK');
      })
      .catch(function() {
        showToast('erro', 'Nao foi possivel acessar', 'Verifique a URL');
      });
  });
}

function sincronizarPlanilha(manual, el) {
  return withActionFeedback(el, 'Disparando atualizacao...', function() {
    if (!state.scriptUrl) {
      if (manual) showToast('warn', 'URL nao configurada', 'Cole a URL do Apps Script primeiro');
      return;
    }
    var url = state.scriptUrl + '?action=syncPlanilha&token=' + SHEETS_TOKEN;
    return fetch(url, { mode: 'no-cors' })
      .then(function() {
        console.log('[Planilha] sincronizacao disparada');
        if (manual) {
          showToast('ok', 'Atualizacao da planilha iniciada', 'O Apps Script vai puxar os dados do Supabase');
        }
      })
      .catch(function(e) {
        console.warn('[Planilha] erro:', e);
      });
  });
}

function configurarPlanilhaUrl(el) {
  return withActionFeedback(el, 'Abrindo configuracao...', function() {
    var atual = state.scriptUrl || '';
    var url = prompt('Cole a URL publicada do Apps Script responsavel por atualizar a planilha:', atual);
    if (url === null) return;
    url = String(url || '').trim();
    state.scriptUrl = url;
    if (url) localStorage.setItem('scriptUrl', url);
    else localStorage.removeItem('scriptUrl');
    showToast('ok', url ? 'URL da planilha salva' : 'Integracao com planilha desativada', '');
  });
}

function exportCSV() {
  var h = 'ID,Tipo,Código,Local,Descrição,Estado,Data,Sincronizado\n';
  var rows = state.scans.map(function(s) {
    return [s.id, s.type, s.code || '', s.room, s.desc || '', s.estado || '', s.ts, s.synced ? 'Sim' : 'Não']
      .map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; })
      .join(',');
  }).join('\n');
  var blob = new Blob([h + rows], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'inventario_' + new Date().toLocaleDateString('pt-BR').replace(/\//g, '-') + '.csv';
  a.click();
}

function confirmClear() {
  if (!confirm('Apagar todos os dados da sessão? Esta ação não pode ser desfeita.')) return;
  state.scans = [];
  state.pendingSync = [];
  saveScans();
  localStorage.setItem('pendingSync', '[]');
  updateStats();
  renderHistList();
  updateSyncBanner();
  showToast('ok', 'Sessão limpa', 'Histórico apagado');
}

function atualizarContextoScanner() {
  var sala = state.currentRoom;
  var ctxDiv = document.getElementById('scannerRoomContext');
  var ctxText = document.getElementById('scannerContextText');
  if (!ctxDiv || !sala) {
    if (ctxDiv) ctxDiv.style.display = 'none';
    return;
  }

  var meusNaSala = state.scans.filter(function(s) {
    return s.type === 'scan' && s.room === sala;
  }).length;
  var total = suapTotais ? (suapTotais[sala] || 0) : 0;

  if (total > 0) {
    var faltam = Math.max(0, total - meusNaSala);
    ctxText.innerHTML = '<strong>' + meusNaSala + '</strong> de <strong>' + total + '</strong> escaneados · faltam <strong style="color:#f59e0b">' + faltam + '</strong>';
    ctxDiv.style.display = 'flex';
  } else if (meusNaSala > 0) {
    ctxText.textContent = meusNaSala + ' itens escaneados nesta sala';
    ctxDiv.style.display = 'flex';
  } else {
    ctxDiv.style.display = 'none';
  }
}

function calcularTempoEstimado() {
  if (state.scans.length < 5) return;
  var el = document.getElementById('progTempoEstimado');
  if (!el) return;

  var agora = Date.now();
  var janela = 2 * 3600 * 1000;
  var recentes = state.scans.filter(function(s) {
    return (agora - new Date(s.ts).getTime()) < janela;
  });

  if (recentes.length < 3) {
    el.style.display = 'none';
    return;
  }

  var ritmoHora = recentes.length / 2;
  var totalSuap = 0;
  if (suapTotais) {
    Object.keys(suapTotais).forEach(function(k) {
      totalSuap += suapTotais[k];
    });
  }
  if (!totalSuap) {
    el.style.display = 'none';
    return;
  }

  var faltam = Math.max(0, totalSuap - state.scans.filter(function(s) { return s.type === 'scan'; }).length);
  if (faltam === 0) {
    el.innerHTML = '🎉 <strong>Inventário completo!</strong>';
    el.style.display = 'block';
    return;
  }

  var horasRestantes = faltam / ritmoHora;
  var texto = '';
  if (horasRestantes < 1) texto = 'menos de 1 hora';
  else if (horasRestantes < 24) texto = Math.ceil(horasRestantes) + ' hora(s)';
  else texto = Math.ceil(horasRestantes / 8) + ' dias úteis (8h/dia)';

  el.innerHTML = '⏱ Ritmo atual: <strong>' + Math.round(ritmoHora) + ' itens/hora</strong> · '
    + 'Faltam ~<strong>' + faltam + '</strong> itens · Estimativa: <strong>' + texto + '</strong>';
  el.style.display = 'block';
}

function renderProgressRooms() {
  var total = state.scans.length;
  var nopat = state.scans.filter(function(s) { return s.type === 'nopat'; }).length;
  var rms = {};
  state.scans.forEach(function(s) { rms[s.room] = 1; });
  var salas = Object.keys(rms).length;
  document.getElementById('progTotal').textContent = total;
  document.getElementById('progSalas').textContent = salas;
  document.getElementById('progNopat').textContent = nopat;

  calcularTempoEstimado();

  var porSala = {};
  state.scans.forEach(function(s) {
    if (!porSala[s.room]) porSala[s.room] = { scan: 0, nopat: 0 };
    if (s.type === 'nopat') porSala[s.room].nopat++;
    else porSala[s.room].scan++;
  });

  var salasSorted = Object.keys(porSala).sort(function(a, b) {
    return (porSala[b].scan + porSala[b].nopat) - (porSala[a].scan + porSala[a].nopat);
  });

  var el = document.getElementById('progRoomList');
  if (!salasSorted.length) {
    el.innerHTML = '<div class="prog-empty">📭<br>Nenhum item escaneado ainda</div>';
    return;
  }

  el.innerHTML = salasSorted.map(function(r) {
    var d = porSala[r];
    var ab = abreviarSala(r);
    var totalSuap = suapTotais ? (suapTotais[r] || 0) : 0;
    var pct = totalSuap > 0 ? Math.min(100, Math.round(d.scan / totalSuap * 100)) : null;
    var cor = pct === null ? 'var(--accent)'
      : pct >= 90 ? 'var(--green)'
      : pct >= 50 ? 'var(--accent)'
      : 'var(--yellow)';

    var barLabel = totalSuap > 0
      ? d.scan + ' de ' + totalSuap + ' patrimônios (' + pct + '%)' + (d.nopat ? ' · ' + d.nopat + ' sem patrim.' : '')
      : d.scan + ' patrimônios' + (d.nopat ? ' · ' + d.nopat + ' sem patrim.' : '');

    var barWidth = pct !== null ? pct : Math.min(100, Math.round(d.scan / 10 * 100));

    return '<div class="prog-room-item">'
      + '<div class="prog-room-header">'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<span style="font-size:18px">' + (ab.emoji || '📍') + '</span>'
      + '<div><div class="prog-room-name">' + esc(ab.curto) + '</div>'
      + (ab.bloco ? '<div class="prog-room-block">' + esc(ab.bloco) + '</div>' : '')
      + '</div></div>'
      + '<div style="text-align:right">'
      + '<div class="prog-room-count" style="color:' + cor + '">' + d.scan + (totalSuap ? ' / ' + totalSuap : '') + '</div>'
      + (d.nopat ? '<div style="font-size:10px;color:var(--yellow);margin-top:1px">+' + d.nopat + ' sem patrim.</div>' : '')
      + '<button data-sala="' + escJ(r) + '" onclick="histBtn(this)" style="background:none;border:1px solid var(--border);border-radius:5px;padding:2px 7px;color:var(--text2);font-size:10px;cursor:pointer;margin-top:3px">ver</button>'
      + '</div>'
      + '</div>'
      + '<div class="prog-bar-wrap">'
      + '<div class="prog-bar-bg"><div class="prog-bar-fill" style="width:' + barWidth + '%;background:' + cor + '"></div></div>'
      + '<div class="prog-bar-label">' + barLabel + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}
