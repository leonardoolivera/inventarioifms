function dbRenderTudo() {
  var pats  = _dbPats;
  var inv   = _dbInv;
  var total = pats.length;

  var codigosEsc = new Set(inv.map(function(i){ return dbStripZ(i.codigo||''); }).filter(Boolean));
  var enc = codigosEsc.size;
  var dup = pats.filter(function(p){ return p.status === '🔴 DUPLICADO'; }).length;
  var pct = total > 0 ? Math.round(enc / total * 100) : 0;
  var faltam = Math.max(total - enc, 0);

  var servMap = {};
  inv.forEach(function(i){ if (i.funcionario) servMap[i.funcionario] = (servMap[i.funcionario]||0)+1; });
  var kpiSrv = Object.keys(servMap).length;

  dbSet('dbKpiEnc', enc.toLocaleString('pt-BR'));
  dbSet('dbKpiEncSub', 'de ' + total.toLocaleString('pt-BR') + ' patrimônios');
  dbSet('dbKpiPct', pct + '%');
  dbSet('dbKpiSrv', kpiSrv);
  dbSet('dbKpiDup', dup);
  dbSet('dbHeroPct', pct + '%');
  dbSet('dbHeroPend', faltam.toLocaleString('pt-BR'));
  var dupEl = document.getElementById('dbKpiDup');
  if (dupEl) dupEl.style.color = dup > 0 ? 'var(--red)' : 'var(--green)';

  var genBar = document.getElementById('dbGenBar');
  if (genBar) genBar.style.width = pct + '%';
  dbSet('dbBarLeft',  enc.toLocaleString('pt-BR') + ' encontrados');
  dbSet('dbBarPct',   pct + '%');
  dbSet('dbBarRight', total.toLocaleString('pt-BR') + ' total');

  var blocoData = {};
  pats.forEach(function(p) {
    var b = dbGetBloco(p.sala_suap);
    if (!blocoData[b]) blocoData[b] = {total:0, enc:0};
    blocoData[b].total++;
    if (dbIsEnc(p.status)) blocoData[b].enc++;
  });
  var blocoHtml = '';
  DB_BLOCOS.forEach(function(b) {
    var d = blocoData[b];
    if (!d || !d.total) return;
    var p = Math.round(d.enc / d.total * 100);
    var cor = p >= 80 ? 'var(--green)' : p >= 50 ? 'var(--accent)' : 'var(--yellow)';
    blocoHtml +=
      '<div class="db-bar-row">' +
        '<div class="db-bar-label">' + b + '</div>' +
        '<div class="db-bar-bg"><div class="db-bar-fill" style="width:'+p+'%;background:'+cor+'"></div></div>' +
        '<div class="db-bar-pct" style="color:'+cor+'">'+p+'%</div>' +
      '</div>' +
      '<div class="db-bar-sub">'+d.enc+' / '+d.total+' itens</div>';
  });
  var blocoEl = document.getElementById('dbBlocos');
  if (blocoEl) blocoEl.innerHTML = blocoHtml || '<div class="hist-empty">Sem dados</div>';

  var porDia = {};
  inv.forEach(function(i) {
    if (!i.criado_em) return;
    var dia = i.criado_em.substring(0, 10);
    porDia[dia] = (porDia[dia] || 0) + 1;
  });
  var diasValidos = Object.keys(porDia).map(function(d){ return porDia[d]; })
                          .filter(function(n){ return n >= MIN_SCANS_DIA; });
  dbSet('dbFaltam', faltam.toLocaleString('pt-BR'));
  if (diasValidos.length === 0) {
    dbSet('dbRitmo',  '—');
    dbSet('dbEstVal', '—');
    dbSet('dbEstUnit', 'dados insuficientes');
  } else {
    var medDiaria = dbMediana(diasValidos);
    var diasEst = faltam / medDiaria;
    dbSet('dbRitmo', medDiaria);
    if (diasEst < 1)  {
      dbSet('dbEstVal', '<1');
      dbSet('dbEstUnit', 'dia útil');
    } else {
      dbSet('dbEstVal', diasEst.toFixed(1));
      dbSet('dbEstUnit', 'dias úteis');
    }
  }

  var alertHtml = '';
  if (dup > 0) alertHtml += '<div class="db-alert db-alert-red">🔴 ' + dup + ' patrimônio(s) duplicado(s)</div>';
  DB_BLOCOS.forEach(function(b) {
    var d = blocoData[b];
    if (d && d.total > 0 && d.enc === d.total) {
      alertHtml += '<div class="db-alert db-alert-green">✅ ' + b + ' concluído!</div>';
    }
  });
  var alertEl = document.getElementById('dbAlertas');
  if (alertEl) alertEl.innerHTML = alertHtml || '<div class="hist-empty">Tudo sob controle</div>';

  var feedHtml = inv.slice(0, 10).map(function(item) {
    var pat = pats.find(function(p){ return dbStripZ(p.numero) === dbStripZ(item.codigo); });
    var isDup = pat && pat.status === '🔴 DUPLICADO';
    var isWrong = pat && pat.status === '🟡 Outro local';
    var dotColor = isDup ? 'var(--red)' : isWrong ? 'var(--yellow)' : 'var(--green)';
    var extra = isDup ? ' <span style="color:var(--red);font-size:10px">· dup!</span>'
              : isWrong ? ' <span style="color:var(--yellow);font-size:10px">· sala errada</span>' : '';
    var hora = item.criado_em ? new Date(item.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '';
    return '<div class="db-feed-item">'
      + '<div class="db-feed-dot" style="background:'+dotColor+'"></div>'
      + '<div><div class="db-feed-text"><strong>'+escHtml(item.funcionario||'Servidor')+'</strong> escaneou <strong>'+escHtml(item.codigo||'?')+'</strong> → '+escHtml(item.sala||'—')+extra+'</div>'
      + '<div class="db-feed-time">'+hora+'</div></div>'
      + '</div>';
  }).join('');
  var feedEl = document.getElementById('dbFeed');
  if (feedEl) feedEl.innerHTML = feedHtml || '<div class="hist-empty">Sem scans recentes</div>';
}
