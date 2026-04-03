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
  var localMatch = state.scans.filter(function(s){
    return s.type === 'scan' && String(s.code).replace(/^0+/,'').indexOf(numStr) > -1;
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
    .catch(function(){});
}

function renderBuscaItem(d) {
  var corStatus = d.status && d.status.indexOf('✅') > -1 ? 'var(--green)'
                : d.status && d.status.indexOf('🟡') > -1 ? 'var(--yellow)'
                : d.status && d.status.indexOf('🔴') > -1 ? 'var(--red)'
                : 'var(--text2)';
  var dataFmt = d.data ? (typeof d.data === 'string' ? d.data.substring(0,16) : fmtTime(new Date(d.data))) : '';
  return '<div class="search-result-card">'
    + '<div class="search-result-head">'
    + '<span class="search-result-num">Nº ' + esc(d.numero) + '</span>'
    + '<span class="search-result-status" style="color:' + corStatus + '">' + esc(d.status || '⏳ Pendente') + '</span>'
    + '</div>'
    + '<div class="search-result-desc">' + esc(d.descricao || '—') + '</div>'
    + '<div class="search-result-meta">📍 ' + esc(d.sala || '—') + (d.quem ? ' · ' + esc(d.quem) : '') + (dataFmt ? ' · ' + esc(dataFmt) : '') + '</div>'
    + '</div>';
}

function adminCarregarFunc() {
  var lista = document.getElementById('funcList');
  if (!lista) return;
  lista.innerHTML = '<div class="hist-empty">Carregando servidores...</div>';
  adminOp('listarFuncionarios', currentUser.siape)
    .then(function(res) {
      if (!res.ok) {
        lista.innerHTML = '<div class="hist-empty">' + escHtml(res.erro || 'Erro ao carregar') + '</div>';
        return;
      }
      var funcs = res.funcionarios || [];
      if (!funcs.length) {
        lista.innerHTML = '<div class="hist-empty">Nenhum funcionario cadastrado.</div>';
        return;
      }
      lista.innerHTML = funcs.map(function(f) {
        var inicial = (f.nome || '?')[0].toUpperCase();
        var badge = f.admin ? '<span class="func-badge admin">admin</span>' : '';
        var inativo = !f.ativo ? '<span class="func-badge inativo">inativo</span>' : '';
        return '<div class="func-item">'
          + '<div class="func-avatar">' + inicial + '</div>'
          + '<div style="flex:1">'
          + '<div class="func-nome">' + escHtml(f.nome) + badge + inativo + '</div>'
          + '<div class="func-siape">SIAPE: ' + escHtml(f.siape) + '</div>'
          + '</div>'
          + (f.siape !== currentUser.siape
              ? '<button class="func-remove" onclick="adminRemoverFunc(\'' + escHtml(f.siape) + '\',\'' + escHtml(f.nome) + '\')">Remover</button>'
              : '')
          + '</div>';
      }).join('');
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
