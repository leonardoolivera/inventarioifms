var CFG = {
  ABA_FUNC: 'Funcionarios',
  ABA_INV: 'Inventario',
  ABA_NOPAT: 'Sem Patrimonio',
  ABA_LOG: 'Log',
  ABA_DASH: 'Dashboard',
  ABA_PAT: 'Patrimonios SUAP',
  ABA_RAW: 'SUAP_Bruto',
  PROP_URL: 'SUPABASE_URL',
  PROP_SERVICE_KEY: 'SUPABASE_SERVICE_ROLE_KEY',
  PROP_ANON_KEY: 'SUPABASE_ANON_KEY',
  PROP_SYNC_TOKEN: 'SYNC_TOKEN',
  DEFAULT_SYNC_TOKEN: 'inv-ifms-2394174'
};

var TEMA = {
  corPrimaria: '#1f4e78',
  corPrimariaEscura: '#163a59',
  corSecundaria: '#eaf2f8',
  corDestaque: '#d9ead3',
  corAlerta: '#fce5cd',
  corErro: '#f4cccc',
  corTexto: '#243447',
  corBorda: '#d0d7de'
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Inventario Campus')
    .addItem('Configurar planilha', 'setup')
    .addItem('Configurar conexao com Supabase', 'configurarSupabase')
    .addItem('Atualizar planilha a partir do Supabase', 'sincronizarPlanilha')
    .addItem('Importar patrimonios da aba SUAP_Bruto', 'importarPatrimonios')
    .addItem('Resumo', 'resumo')
    .addItem('Resetar inventario no Supabase', 'resetar')
    .addToUi();
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  criarOuAtualizarAba(ss, CFG.ABA_FUNC, ['SIAPE', 'Nome', 'Admin', 'Ativo', 'Criado em']);
  criarOuAtualizarAba(ss, CFG.ABA_PAT, ['Numero', 'Descricao', 'Sala SUAP', 'Estado SUAP', 'Status', 'Local encontrado', 'Encontrado por', 'Encontrado em']);
  criarOuAtualizarAba(ss, CFG.ABA_INV, ['ID', 'Data/Hora', 'Codigo', 'Local', 'Funcionario', 'SIAPE', 'Sincronizado em']);
  criarOuAtualizarAba(ss, CFG.ABA_NOPAT, ['ID', 'Data/Hora', 'Local', 'Descricao', 'Estado', 'Miniatura', 'Abrir foto', 'Foto URL', 'Funcionario', 'SIAPE', 'Sincronizado em']);
  criarOuAtualizarAba(ss, CFG.ABA_LOG, ['Item ID', 'Tipo', 'Codigo', 'Sala', 'Descricao', 'Estado', 'Criado em', 'Sincronizado em']);
  criarOuAtualizarAba(ss, CFG.ABA_DASH, ['Indicador', 'Valor']);
  aplicarTemaPlanilha(ss);
  SpreadsheetApp.getUi().alert('Planilha configurada. Agora configure a conexao com o Supabase no menu.');
}

function configurarSupabase() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();

  var url = ui.prompt('Supabase URL', 'Cole a URL do projeto Supabase:', ui.ButtonSet.OK_CANCEL);
  if (url.getSelectedButton() !== ui.Button.OK) return;

  var serviceKey = ui.prompt('Service Role Key', 'Cole a service role key do Supabase:', ui.ButtonSet.OK_CANCEL);
  if (serviceKey.getSelectedButton() !== ui.Button.OK) return;

  var anonKey = ui.prompt('Anon Key', 'Cole a anon key do Supabase (usada para leituras publicas):', ui.ButtonSet.OK_CANCEL);
  if (anonKey.getSelectedButton() !== ui.Button.OK) return;

  props.setProperty(CFG.PROP_URL, limpar(url.getResponseText()));
  props.setProperty(CFG.PROP_SERVICE_KEY, limpar(serviceKey.getResponseText()));
  props.setProperty(CFG.PROP_ANON_KEY, limpar(anonKey.getResponseText()));
  if (!props.getProperty(CFG.PROP_SYNC_TOKEN)) {
    props.setProperty(CFG.PROP_SYNC_TOKEN, CFG.DEFAULT_SYNC_TOKEN);
  }

  ui.alert('Conexao salva com sucesso.');
}

function sincronizarPlanilha() {
  var dados = buscarDadosSupabase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  escreverFuncionarios(ss, dados.funcionarios || []);
  escreverPatrimonios(ss, dados.patrimonios || []);
  escreverScans(ss, dados.scans || []);
  escreverSemPatrimonio(ss, dados.semPatrimonio || []);
  escreverLog(ss, dados.logs || []);
  atualizarDashboard(ss, dados);

  return { ok: true, msg: 'Planilha atualizada a partir do Supabase.' };
}

function importarPatrimonios() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CFG.ABA_RAW);
  if (!sh) {
    SpreadsheetApp.getUi().alert('Aba "SUAP_Bruto" nao encontrada.');
    return;
  }

  var valores = sh.getDataRange().getValues();
  if (valores.length < 2) {
    SpreadsheetApp.getUi().alert('A aba SUAP_Bruto esta vazia.');
    return;
  }

  var header = valores[0].map(function(h) { return String(h || '').toLowerCase().trim(); });
  var iNum = encontrarIndice(header, ['numero', 'patrimonio', 'tombamento', 'codigo']);
  var iDesc = encontrarIndice(header, ['descricao', 'item', 'nome', 'bem']);
  var iSala = encontrarIndice(header, ['sala', 'local', 'ambiente']);
  var iEstado = encontrarIndice(header, ['estado', 'estado_suap', 'conservacao', 'condicao']);

  if (iNum === -1) {
    SpreadsheetApp.getUi().alert('Nao encontrei uma coluna de numero/patrimonio na aba SUAP_Bruto.');
    return;
  }

  var rows = [];
  for (var i = 1; i < valores.length; i++) {
    var numero = normalizarNumero(valores[i][iNum]);
    if (!numero) continue;
    rows.push({
      numero: numero,
      descricao: iDesc > -1 ? limpar(valores[i][iDesc]).substring(0, 200) : '',
      sala_suap: iSala > -1 ? limpar(valores[i][iSala]) : '',
      estado_suap: iEstado > -1 ? limpar(valores[i][iEstado]) : '',
      status: '',
      local_encontrado: '',
      encontrado_por: ''
    });
  }

  if (!rows.length) {
    SpreadsheetApp.getUi().alert('Nenhum patrimonio valido encontrado na aba SUAP_Bruto.');
    return;
  }

  upsertPatrimoniosSupabase(rows);
  sincronizarPlanilha();
  SpreadsheetApp.getUi().alert(rows.length + ' patrimonios enviados ao Supabase e planilha atualizada.');
}

function resetar() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    'Resetar inventario',
    'Isso vai apagar scans, itens sem patrimonio e log no Supabase, alem de limpar o status dos patrimonios. Deseja continuar?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  resetarSupabase();
  sincronizarPlanilha();
  ui.alert('Inventario resetado no Supabase e planilha atualizada.');
}

function resumo() {
  var dados = buscarDadosSupabase();
  var totalPat = (dados.patrimonios || []).length;
  var totalScans = (dados.scans || []).length;
  var totalNopat = (dados.semPatrimonio || []).length;
  var pendentes = dados.patrimonios.filter(function(p) { return !limpar(p.status); }).length;

  SpreadsheetApp.getUi().alert(
    'Resumo atual\n\n' +
    'Patrimonios: ' + totalPat +
    '\nScans: ' + totalScans +
    '\nSem patrimonio: ' + totalNopat +
    '\nPendentes: ' + pendentes
  );
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
  if (action === 'ping') return out({ ok: true, msg: 'Apps Script online', ts: new Date().toISOString() });

  if (action === 'syncPlanilha' || action === 'atualizarDashboard') {
    validarToken(e && e.parameter ? e.parameter.token : '');
    return out(sincronizarPlanilha());
  }

  return out({ ok: false, erro: 'Acao desconhecida: ' + action });
}

function doPost(e) {
  try {
    var body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    if (body.action === 'syncPlanilha') {
      validarToken(body.token || '');
      return out(sincronizarPlanilha());
    }
    return out({ ok: false, erro: 'Acao desconhecida' });
  } catch (err) {
    return out({ ok: false, erro: String(err) });
  }
}

function validarToken(token) {
  var esperado = PropertiesService.getScriptProperties().getProperty(CFG.PROP_SYNC_TOKEN) || CFG.DEFAULT_SYNC_TOKEN;
  if (token !== esperado) throw new Error('Nao autorizado');
}

function buscarDadosSupabase() {
  return {
    funcionarios: sbFetchAll('funcionarios', 'select=siape,nome,admin,ativo,criado_em&order=nome.asc', false),
    patrimonios: sbFetchAll('patrimonios', 'select=numero,descricao,sala_suap,estado_suap,status,local_encontrado,encontrado_por,encontrado_em&order=numero.asc', false),
    scans: sbFetchAll('scans', 'select=id,codigo,sala,funcionario,siape,criado_em,sincronizado_em&order=criado_em.desc', false),
    semPatrimonio: sbFetchAll('sem_patrimonio', 'select=id,sala,descricao,estado,foto_url,funcionario,siape,criado_em,sincronizado_em&order=criado_em.desc', false),
    logs: sbFetchAll('log_operacoes', 'select=item_id,tipo,codigo,sala,descricao,estado,criado_em,sincronizado_em&order=criado_em.desc', false)
  };
}

function upsertPatrimoniosSupabase(rows) {
  var lote;
  for (var i = 0; i < rows.length; i += 500) {
    lote = rows.slice(i, i + 500);
    sbRequest('/rest/v1/patrimonios?on_conflict=numero', {
      method: 'post',
      muteHttpExceptions: true,
      payload: JSON.stringify(lote),
      contentType: 'application/json',
      headers: {
        Prefer: 'resolution=merge-duplicates'
      }
    }, true);
  }
}

function resetarSupabase() {
  sbRequest('/rest/v1/scans?id=not.is.null', { method: 'delete', muteHttpExceptions: true }, true);
  sbRequest('/rest/v1/sem_patrimonio?id=not.is.null', { method: 'delete', muteHttpExceptions: true }, true);
  sbRequest('/rest/v1/log_operacoes?id=neq.-1', { method: 'delete', muteHttpExceptions: true }, true);
  sbRequest('/rest/v1/patrimonios?id=gt.0', {
    method: 'patch',
    muteHttpExceptions: true,
    payload: JSON.stringify({
      status: '',
      local_encontrado: '',
      encontrado_por: '',
      encontrado_em: null
    }),
    contentType: 'application/json'
  }, true);
}

function sbFetchAll(table, query, useServiceKey) {
  var result = [];
  var from = 0;
  var page = 1000;
  while (true) {
    var sep = query ? '&' : '';
    var path = '/rest/v1/' + table + '?' + query + sep + 'limit=' + page + '&offset=' + from;
    var data = sbRequest(path, { method: 'get', muteHttpExceptions: true }, useServiceKey);
    if (!data || !data.length) break;
    result = result.concat(data);
    if (data.length < page) break;
    from += page;
  }
  return result;
}

function sbRequest(path, options, useServiceKey) {
  var cfg = getSupabaseConfig();
  var key = useServiceKey ? cfg.serviceKey : cfg.anonKey;
  if (!cfg.url || !key) throw new Error('Supabase nao configurado no Apps Script.');

  var opts = options || {};
  var headers = opts.headers || {};
  headers.apikey = key;
  headers.Authorization = 'Bearer ' + key;
  opts.headers = headers;

  var resp = UrlFetchApp.fetch(cfg.url + path, opts);
  var code = resp.getResponseCode();
  var text = resp.getContentText();

  if (code >= 400) {
    throw new Error('Supabase ' + code + ': ' + text.substring(0, 500));
  }

  if (!text) return [];
  return JSON.parse(text);
}

function getSupabaseConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    url: props.getProperty(CFG.PROP_URL) || '',
    serviceKey: props.getProperty(CFG.PROP_SERVICE_KEY) || '',
    anonKey: props.getProperty(CFG.PROP_ANON_KEY) || ''
  };
}

function escreverFuncionarios(ss, rows) {
  var valores = [['SIAPE', 'Nome', 'Admin', 'Ativo', 'Criado em']];
  rows.forEach(function(r) {
    valores.push([
      limpar(r.siape),
      limpar(r.nome),
      r.admin ? 'Sim' : 'Nao',
      r.ativo ? 'Sim' : 'Nao',
      fmt(r.criado_em)
    ]);
  });
  escreverTabela(ss, CFG.ABA_FUNC, valores);
}

function escreverPatrimonios(ss, rows) {
  var valores = [['Numero', 'Descricao', 'Sala SUAP', 'Estado SUAP', 'Status', 'Local encontrado', 'Encontrado por', 'Encontrado em']];
  rows.forEach(function(r) {
    valores.push([
      limpar(r.numero),
      limpar(r.descricao),
      limpar(r.sala_suap),
      limpar(r.estado_suap),
      limpar(r.status),
      limpar(r.local_encontrado),
      limpar(r.encontrado_por),
      fmt(r.encontrado_em)
    ]);
  });
  escreverTabela(ss, CFG.ABA_PAT, valores);
}

function escreverScans(ss, rows) {
  var valores = [['ID', 'Data/Hora', 'Codigo', 'Local', 'Funcionario', 'SIAPE', 'Sincronizado em']];
  rows.forEach(function(r) {
    valores.push([
      limpar(r.id),
      fmt(r.criado_em),
      limpar(r.codigo),
      limpar(r.sala),
      limpar(r.funcionario),
      limpar(r.siape),
      fmt(r.sincronizado_em)
    ]);
  });
  escreverTabela(ss, CFG.ABA_INV, valores);
}

function escreverSemPatrimonio(ss, rows) {
  var valores = [['ID', 'Data/Hora', 'Local', 'Descricao', 'Estado', 'Miniatura', 'Abrir foto', 'Foto URL', 'Funcionario', 'SIAPE', 'Sincronizado em']];
  rows.forEach(function(r) {
    var fotoUrl = limpar(r.foto_url);
    var formulaImagem = fotoUrl ? '=IMAGE("' + fotoUrl.replace(/"/g, '""') + '";4;90;90)' : '';
    var formulaLink = fotoUrl ? '=HYPERLINK("' + fotoUrl.replace(/"/g, '""') + '";"Ver foto")' : '';
    valores.push([
      limpar(r.id),
      fmt(r.criado_em),
      limpar(r.sala),
      limpar(r.descricao),
      limpar(r.estado),
      formulaImagem,
      formulaLink,
      fotoUrl,
      limpar(r.funcionario),
      limpar(r.siape),
      fmt(r.sincronizado_em)
    ]);
  });
  escreverTabela(ss, CFG.ABA_NOPAT, valores);
}

function escreverLog(ss, rows) {
  var valores = [['Item ID', 'Tipo', 'Codigo', 'Sala', 'Descricao', 'Estado', 'Criado em', 'Sincronizado em']];
  rows.forEach(function(r) {
    valores.push([
      limpar(r.item_id),
      limpar(r.tipo),
      limpar(r.codigo),
      limpar(r.sala),
      limpar(r.descricao),
      limpar(r.estado),
      fmt(r.criado_em),
      fmt(r.sincronizado_em)
    ]);
  });
  escreverTabela(ss, CFG.ABA_LOG, valores);
}

function atualizarDashboard(ss, dados) {
  var patrimonios = dados.patrimonios || [];
  var scans = dados.scans || [];
  var semPatrimonio = dados.semPatrimonio || [];
  var total = patrimonios.length;
  var encontrados = patrimonios.filter(function(p) {
    return contemAlgumTexto(p.status, ['Encontrado', 'Outro local']);
  }).length;
  var duplicados = patrimonios.filter(function(p) {
    return contemAlgumTexto(p.status, ['DUPLICADO']);
  }).length;
  var pendentes = patrimonios.filter(function(p) { return !limpar(p.status); }).length;
  var progresso = total ? Math.round((encontrados / total) * 100) : 0;
  var servidores = {};
  var locais = {};
  var agora = fmt(new Date().toISOString());

  scans.forEach(function(s) {
    var nome = limpar(s.funcionario) || 'Servidor';
    var local = limpar(s.sala) || 'Local nao informado';
    servidores[nome] = (servidores[nome] || 0) + 1;
    locais[local] = (locais[local] || 0) + 1;
  });

  var topServidor = obterTopItem(servidores, 'Nenhum registro');
  var topLocal = obterTopItem(locais, 'Nenhum registro');
  var linhas = [
    ['Painel de Inventario IFMS', '', '', ''],
    ['Atualizado em ' + agora, '', '', ''],
    ['', '', '', ''],
    ['Resumo Geral', '', 'Produtividade', ''],
    ['Patrimonios totais', total, 'Scans registrados', scans.length],
    ['Patrimonios encontrados', encontrados, 'Servidores ativos', Object.keys(servidores).length],
    ['Patrimonios pendentes', pendentes, 'Itens sem patrimonio', semPatrimonio.length],
    ['Duplicados', duplicados, 'Progresso geral', progresso + '%'],
    ['', '', '', ''],
    ['Destaques', '', 'Acompanhamento', ''],
    ['Servidor com mais registros', topServidor.label, 'Percentual concluido', progresso + '%'],
    ['Total desse servidor', topServidor.value, 'Ultima sincronizacao', agora],
    ['Local com mais scans', topLocal.label, 'Status da base', total ? 'Ativa' : 'Aguardando dados'],
    ['Total nesse local', topLocal.value, 'Pendencias abertas', pendentes]
  ];

  escreverDashboard(ss, linhas, progresso);
}

function escreverTabela(ss, nome, valores) {
  var sh = criarOuAtualizarAba(ss, nome, valores[0]);
  limparAbaVisual(sh);
  sh.getRange(1, 1, valores.length, valores[0].length).setValues(valores);
  aplicarLayoutTabela(sh, nome, valores.length, valores[0].length);
}

function criarOuAtualizarAba(ss, nome, header) {
  var sh = ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  aplicarCabecalhoTabela(sh.getRange(1, 1, 1, header.length));
  sh.setFrozenRows(1);
  return sh;
}

function escreverDashboard(ss, valores, progresso) {
  var sh = ss.getSheetByName(CFG.ABA_DASH);
  if (!sh) sh = ss.insertSheet(CFG.ABA_DASH);

  limparAbaVisual(sh);
  sh.getRange(1, 1, valores.length, valores[0].length).setValues(valores);
  estilizarDashboard(sh, progresso, valores.length, valores[0].length);
}

function aplicarTemaPlanilha(ss) {
  ss.getSheets().forEach(function(sh) {
    if (sh.getName() !== CFG.ABA_DASH) {
      sh.setFrozenRows(1);
      sh.setHiddenGridlines(false);
    }
  });
}

function limparAbaVisual(sh) {
  if (sh.getFilter()) sh.getFilter().remove();
  sh.getBandings().forEach(function(banding) { banding.remove(); });
  sh.setConditionalFormatRules([]);
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart();
  sh.clear();
}

function aplicarCabecalhoTabela(range) {
  range
    .setBackground(TEMA.corPrimaria)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true, TEMA.corPrimariaEscura, SpreadsheetApp.BorderStyle.SOLID);
}

function aplicarLayoutTabela(sh, nome, totalLinhas, totalColunas) {
  var ultimaLinha = Math.max(totalLinhas, 2);
  var ultimaColuna = Math.max(totalColunas, 1);
  var range = sh.getRange(1, 1, ultimaLinha, ultimaColuna);

  aplicarCabecalhoTabela(sh.getRange(1, 1, 1, ultimaColuna));
  sh.setHiddenGridlines(true);
  sh.setFrozenRows(1);

  if (totalLinhas > 1) {
    sh.getRange(2, 1, totalLinhas - 1, ultimaColuna)
      .setFontColor(TEMA.corTexto)
      .setFontSize(10)
      .setVerticalAlignment('middle');
    range.createFilter();
    range.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
  }

  sh.getRange(1, 1, ultimaLinha, ultimaColuna)
    .setBorder(true, true, true, true, true, true, TEMA.corBorda, SpreadsheetApp.BorderStyle.SOLID_THIN);

  definirLarguras(sh, nome);
  aplicarFormatosEspecificos(sh, nome, totalLinhas);
}

function definirLarguras(sh, nome) {
  var larguras = {
    Funcionarios: [110, 240, 90, 90, 160],
    'Patrimonios SUAP': [110, 320, 140, 140, 160, 170, 180, 170],
    Inventario: [90, 160, 120, 140, 180, 110, 160],
    'Sem Patrimonio': [90, 160, 140, 280, 120, 120, 110, 260, 180, 110, 160],
    Log: [100, 110, 120, 140, 260, 120, 160, 160]
  };
  var cols = larguras[nome];
  if (!cols) {
    sh.autoResizeColumns(1, sh.getLastColumn() || 1);
    return;
  }
  for (var i = 0; i < cols.length; i++) {
    sh.setColumnWidth(i + 1, cols[i]);
  }
}

function aplicarFormatosEspecificos(sh, nome, totalLinhas) {
  if (totalLinhas < 2) return;

  var regras = [];
  if (nome === CFG.ABA_FUNC) {
    regras.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('Sim')
        .setBackground(TEMA.corDestaque)
        .setRanges([sh.getRange(2, 3, totalLinhas - 1, 2)])
        .build()
    );
    regras.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('Nao')
        .setBackground(TEMA.corErro)
        .setRanges([sh.getRange(2, 3, totalLinhas - 1, 2)])
        .build()
    );
  }

  if (nome === CFG.ABA_PAT) {
    var statusRange = sh.getRange(2, 5, totalLinhas - 1, 1);
    regras.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains('Encontrado')
        .setBackground(TEMA.corDestaque)
        .setRanges([statusRange])
        .build()
    );
    regras.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains('Outro local')
        .setBackground(TEMA.corAlerta)
        .setRanges([statusRange])
        .build()
    );
    regras.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains('DUPLICADO')
        .setBackground(TEMA.corErro)
        .setRanges([statusRange])
        .build()
    );
  }

  if (nome === CFG.ABA_NOPAT) {
    sh.getRange(2, 4, totalLinhas - 1, 1).setWrap(true);
    sh.getRange(2, 8, totalLinhas - 1, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    sh.getRange(2, 7, totalLinhas - 1, 1).setHorizontalAlignment('center');
    sh.setRowHeights(2, totalLinhas - 1, 96);
  }

  if (nome === CFG.ABA_LOG) {
    sh.getRange(2, 5, totalLinhas - 1, 1).setWrap(true);
  }

  sh.setConditionalFormatRules(regras);
}

function estilizarDashboard(sh, progresso, totalLinhas, totalColunas) {
  sh.setHiddenGridlines(true);
  sh.setFrozenRows(0);
  sh.setColumnWidths(1, 4, 210);
  sh.setRowHeights(1, totalLinhas, 28);

  sh.getRange(1, 1, totalLinhas, totalColunas)
    .setFontColor(TEMA.corTexto)
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('left')
    .setBorder(false, false, false, false, false, false);

  sh.getRange('A1:D2')
    .merge()
    .setBackground(TEMA.corPrimaria)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(18)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  estilizarSecaoDashboard(sh.getRange('A4:B4'));
  estilizarSecaoDashboard(sh.getRange('C4:D4'));
  estilizarSecaoDashboard(sh.getRange('A10:B10'));
  estilizarSecaoDashboard(sh.getRange('C10:D10'));

  destacarBloco(sh.getRange('A5:B8'), TEMA.corSecundaria);
  destacarBloco(sh.getRange('C5:D8'), '#edf7ed');
  destacarBloco(sh.getRange('A11:B14'), '#f8f9fa');
  destacarBloco(sh.getRange('C11:D14'), '#fff7e6');

  sh.getRange('A5:A14').setFontWeight('bold');
  sh.getRange('C5:C14').setFontWeight('bold');
  sh.getRange('B5:B14').setHorizontalAlignment('right');
  sh.getRange('D5:D14').setHorizontalAlignment('right');
  sh.getRange('D11').setBackground(corProgresso(progresso)).setFontWeight('bold');
}

function estilizarSecaoDashboard(range) {
  range
    .merge()
    .setBackground(TEMA.corPrimariaEscura)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
}

function destacarBloco(range, cor) {
  range
    .setBackground(cor)
    .setBorder(true, true, true, true, true, true, TEMA.corBorda, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}

function corProgresso(progresso) {
  if (progresso >= 80) return '#c6e0b4';
  if (progresso >= 50) return '#ffe699';
  return '#f4cccc';
}

function obterTopItem(mapa, fallback) {
  var top = { label: fallback, value: 0 };
  Object.keys(mapa).forEach(function(chave) {
    if (mapa[chave] > top.value) {
      top = { label: chave, value: mapa[chave] };
    }
  });
  return top;
}

function contemAlgumTexto(valor, termos) {
  var texto = limpar(valor).toLowerCase();
  for (var i = 0; i < termos.length; i++) {
    if (texto.indexOf(String(termos[i]).toLowerCase()) > -1) return true;
  }
  return false;
}

function encontrarIndice(header, opcoes) {
  for (var i = 0; i < header.length; i++) {
    for (var j = 0; j < opcoes.length; j++) {
      if (header[i].indexOf(opcoes[j]) > -1) return i;
    }
  }
  return -1;
}

function normalizarNumero(valor) {
  return String(valor || '').replace(/^0+/, '').replace(/\.0$/, '').trim();
}

function limpar(valor) {
  return String(valor == null ? '' : valor).trim();
}

function fmt(valor) {
  if (!valor) return '';
  var data = valor instanceof Date ? valor : new Date(valor);
  return Utilities.formatDate(data, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
}

function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
