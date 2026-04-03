var MIN_SCANS_DIA = 50;
var _dbPats = [];
var _dbInv  = [];
var _dbTimer = null;

var DB_BLOCOS = ['Bloco A', 'Bloco B', 'Bloco C', 'Salas Modulares', 'Área Externa'];

function dbGetBloco(sala) {
  if (!sala) return 'Outros';
  var s = sala.toUpperCase();
  if (s.indexOf('(BLOCO A)') > -1) return 'Bloco A';
  if (s.indexOf('(BLOCO B)') > -1) return 'Bloco B';
  if (s.indexOf('(BLOCO C)') > -1) return 'Bloco C';
  if (s.indexOf('(SALAS MODULARES)') > -1) return 'Salas Modulares';
  return 'Área Externa';
}

function dbIsEnc(status) {
  return status === '✅ Encontrado' || status === '🟡 Outro local';
}

function dbSet(id, val) {
  var e = document.getElementById(id);
  if (e) e.textContent = val;
}

function dbMediana(arr) {
  var sorted = arr.slice().sort(function(a, b) { return a - b; });
  var mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function dbStripZ(s) {
  return String(s || '').replace(/^0+/, '');
}

function carregarDashboard() {
  var badge = document.getElementById('dbLiveBadge');
  if (badge) {
    badge.textContent = 'atualizando...';
    badge.className = 'db-live-badge connecting';
  }

  Promise.all([
    sbFetchAll('/rest/v1/patrimonios?select=numero,sala_suap,status'),
    sbFetchAll('/rest/v1/scans?select=codigo,sala,funcionario,siape,criado_em&order=criado_em.desc')
  ]).then(function(results) {
    _dbPats = results[0] || [];
    _dbInv = results[1] || [];
    dbRenderTudo();
    if (badge) {
      badge.textContent = '● ao vivo';
      badge.className = 'db-live-badge';
    }
    dbSet('dbLastUpdate', 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR'));
    clearInterval(_dbTimer);
    _dbTimer = setInterval(function() {
      var sc = document.getElementById('scDashboard');
      if (sc && !sc.classList.contains('hidden') && !sc.classList.contains('slide-left')) {
        carregarDashboard();
      } else {
        clearInterval(_dbTimer);
      }
    }, 30000);
  }).catch(function(err) {
    if (badge) {
      badge.textContent = 'erro';
      badge.className = 'db-live-badge connecting';
    }
    dbSet('dbLastUpdate', 'Erro ao carregar dados');
    console.error('[Dashboard]', err);
  });
}

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
