var buscarPatrimonioRemoto = window.buscarPatrimonio;
var buscaTimers = {};

function debounceBusca(val, contextName) {
  var key = contextName || 'default';
  clearTimeout(buscaTimers[key]);
  buscaTimers[key] = setTimeout(function() {
    buscarPatrimonioUI(val, key);
  }, 250);
}

function getBuscaContext(contextName) {
  if (contextName === 'scanner') {
    return {
      resultEl: document.getElementById('scannerSearchResults'),
      subEl: document.getElementById('scannerSearchHint')
    };
  }
  return {
    resultEl: document.getElementById('buscaResult'),
    subEl: document.getElementById('buscaSub')
  };
}

function buscarPatrimonioUI(val, contextName) {
  val = String(val || '').trim();
  var ctx = getBuscaContext(contextName);
  var res = ctx.resultEl;
  var sub = ctx.subEl;
  if (!res || !sub) return;

  if (!val || val.length < 3) {
    res.innerHTML = '<div class="search-empty">Digite pelo menos 3 digitos</div>';
    sub.textContent = 'Digite o numero';
    return;
  }

  var numStr = val.replace(/^0+/, '');
  var localMatch = state.scans.filter(function(s) {
    return s.type === 'scan' && String(s.code).replace(/^0+/, '').indexOf(numStr) > -1;
  });

  if (localMatch.length) {
    sub.textContent = localMatch.length + ' resultado(s) local';
    res.innerHTML = localMatch.map(function(s) {
      return renderBuscaItem({
        numero: s.code,
        descricao: '-',
        sala: s.sala || s.room,
        status: '\u2705 Encontrado (local)',
        quem: s.funcionario || '',
        data: s.ts
      });
    }).join('');
  } else {
    res.innerHTML = '<div class="search-empty">Buscando...</div>';
    sub.textContent = 'Buscando...';
  }

  if (!state.isOnline || typeof buscarPatrimonioRemoto !== 'function') return;

  buscarPatrimonioRemoto(val)
    .then(function(data) {
      if (!data.ok) return;
      sub.textContent = data.resultados.length + ' resultado(s)';
      if (!data.resultados.length) {
        res.innerHTML = '<div class="search-empty">Patrimonio nao encontrado</div>';
        return;
      }
      res.innerHTML = data.resultados.map(renderBuscaItem).join('');
    })
    .catch(function() {});
}

function renderBuscaItem(d) {
  var corStatus = d.status && d.status.indexOf('✅') > -1 ? 'var(--green)'
    : d.status && d.status.indexOf('🟡') > -1 ? 'var(--yellow)'
    : d.status && d.status.indexOf('🔴') > -1 ? 'var(--red)'
    : 'var(--text2)';
  var dataFmt = d.data ? (typeof d.data === 'string' ? d.data.substring(0, 16) : fmtTime(new Date(d.data))) : '';
  return '<div class="search-result-card">'
    + '<div class="search-result-head">'
    + '<span class="search-result-num">Nº ' + esc(d.numero) + '</span>'
    + '<span class="search-result-status" style="color:' + corStatus + '">' + esc(d.status || '⏳ Pendente') + '</span>'
    + '</div>'
    + '<div class="search-result-desc">' + esc(d.descricao || '—') + '</div>'
    + '<div class="search-result-meta">📍 ' + esc(d.sala || '—') + (d.quem ? ' · ' + esc(d.quem) : '') + (dataFmt ? ' · ' + esc(dataFmt) : '') + '</div>'
    + '</div>';
}

function handleScannerSearchInput(val) {
  var panel = document.getElementById('scannerSearchPanel');
  var results = document.getElementById('scannerSearchResults');
  var hint = document.getElementById('scannerSearchHint');
  val = String(val || '').trim();
  if (!panel || !results || !hint) return;
  if (!val) {
    panel.classList.remove('show');
    hint.textContent = 'Digite pelo menos 3 digitos';
    results.innerHTML = '';
    return;
  }
  panel.classList.add('show');
  debounceBusca(val, 'scanner');
}
