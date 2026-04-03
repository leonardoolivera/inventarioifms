function renderHistList() {
  var el = document.getElementById('histList');
  var sub = document.getElementById('histSub');
  if (!el || !sub) return;
  sub.textContent = state.scans.length + ' registros';

  if (!state.scans.length) {
    el.innerHTML = '<div class="hist-empty">Nenhum scan ainda.</div>';
    return;
  }

  var total = state.scans.length;
  var scans = state.scans.filter(function(s){ return s.type === 'scan'; }).length;
  var nopat = state.scans.filter(function(s){ return s.type === 'nopat'; }).length;
  var sorted = state.scans.slice().reverse();

  el.innerHTML = '<div class="hist-summary">'
    + '<div class="hist-summary-card"><div class="hist-summary-n">' + total + '</div><div class="hist-summary-l">Registros</div></div>'
    + '<div class="hist-summary-card"><div class="hist-summary-n">' + scans + '</div><div class="hist-summary-l">Patrimonios</div></div>'
    + '<div class="hist-summary-card"><div class="hist-summary-n">' + nopat + '</div><div class="hist-summary-l">Sem patrimonio</div></div>'
    + '</div>'
    + sorted.map(function(s) {
      var dot = s.type === 'nopat' ? 'warn' : 'ok';
      var title = s.type === 'nopat' ? (s.desc || 'Item sem patrimonio') : 'Cod. ' + s.code;
      var meta = 'Local: ' + s.room + (s.type === 'nopat' ? ' | Estado: ' + s.estado : '');
      var sync = s.synced ? '<div class="hi-sync done">Sincronizado</div>' : '<div class="hi-sync pending">Pendente</div>';
      return '<div class="hist-item">'
        + '<div class="hi-dot ' + dot + '"></div>'
        + '<div class="hi-info"><div class="hi-title">' + esc(title) + '</div>'
        + '<div class="hi-meta">' + esc(meta) + '</div>'
        + sync + '</div>'
        + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">'
        + '<div class="hi-time">' + fmtTime(new Date(s.ts)) + '</div>'
        + '</div>'
        + '</div>';
    }).join('');
}
