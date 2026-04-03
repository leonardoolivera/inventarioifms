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
  var scans = state.scans.filter(function(scan) {
    return scan.type === 'scan';
  }).length;
  var nopat = state.scans.filter(function(scan) {
    return scan.type === 'nopat';
  }).length;
  var sorted = state.scans.slice().reverse();

  el.innerHTML = '<div class="hist-summary">'
    + '<div class="hist-summary-card"><div class="hist-summary-n">' + total + '</div><div class="hist-summary-l">Registros</div></div>'
    + '<div class="hist-summary-card"><div class="hist-summary-n">' + scans + '</div><div class="hist-summary-l">Patrimonios</div></div>'
    + '<div class="hist-summary-card"><div class="hist-summary-n">' + nopat + '</div><div class="hist-summary-l">Sem patrimonio</div></div>'
    + '</div>'
    + sorted.map(function(scan) {
      var dot = scan.type === 'nopat' ? 'warn' : 'ok';
      var title = scan.type === 'nopat' ? (scan.desc || 'Item sem patrimonio') : 'Cod. ' + scan.code;
      var meta = 'Local: ' + scan.room + (scan.type === 'nopat' ? ' | Estado: ' + scan.estado : '');
      var sync = scan.synced
        ? '<div class="hi-sync done">Sincronizado</div>'
        : '<div class="hi-sync pending">Pendente</div>';

      return '<div class="hist-item">'
        + '<div class="hi-dot ' + dot + '"></div>'
        + '<div class="hi-info"><div class="hi-title">' + esc(title) + '</div>'
        + '<div class="hi-meta">' + esc(meta) + '</div>'
        + sync + '</div>'
        + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">'
        + '<div class="hi-time">' + fmtTime(new Date(scan.ts)) + '</div>'
        + '</div>'
        + '</div>';
    }).join('');
}

window.renderHistList = renderHistList;
