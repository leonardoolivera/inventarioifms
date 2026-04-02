// ================================================================
//  INVENTÁRIO CAMPUS — Google Apps Script  v3
// ================================================================

var CFG = {
  ABA_FUNC:  "Funcionários",
  ABA_INV:   "Inventário",
  ABA_NOPAT: "Sem Patrimônio",
  ABA_LOG:   "Log",
  ABA_DASH:  "📊 Dashboard",
  ABA_PAT:   "Patrimônios SUAP",
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📋 Inventário Campus")
    .addItem("⚙️ Configurar planilha", "setup")
    .addItem("📊 Atualizar Dashboard", "atualizarDashboardMenu")
    .addItem("📦 Importar Patrimônios SUAP", "importarPatrimonios")
    .addItem("✅ Concluir Inventário", "concluirInventario")
    .addItem("🧪 Simular Inventário (teste)", "simularInventario")
    .addItem("🔑 Configurar Chave Gemini", "configurarChaveGemini")
    .addItem("📊 Resumo", "resumo")
    .addItem("🔄 Resetar", "resetar")
    .addToUi();
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  criarAba(ss, CFG.ABA_FUNC,  ["SIAPE","Nome"],                                                           ["#1a1d27","#7c5cfc"]);
  criarAba(ss, CFG.ABA_INV,   ["Data/Hora","Código","Local","Funcionário","SIAPE","Sync em"], ["#1a1d27","#4f8cff"]);
  criarAba(ss, CFG.ABA_NOPAT, ["Data/Hora","Local","Descrição","Estado","Foto","🔗 Link foto","Sync em"], ["#1a1d27","#f59e0b"]);
  criarAba(ss, CFG.ABA_LOG,   ["Data/Hora","ID","Tipo","Código","Local","Desc","Estado","Sync em"], ["#1a1d27","#8891b0"]);
  atualizarDashboard(ss);
  SpreadsheetApp.getUi().alert("✅ Planilha configurada!");
}

function criarAba(ss, nome, cab, cores) {
  var s = ss.getSheetByName(nome);
  if (!s) {
    s = ss.insertSheet(nome);
    s.getRange(1,1,1,cab.length).setValues([cab]);
  } else {
    // Sempre atualiza o cabeçalho para garantir colunas corretas
    s.getRange(1,1,1,cab.length).setValues([cab]);
  }
  s.getRange(1,1,1,cab.length).setBackground(cores[0]).setFontColor(cores[1]).setFontWeight("bold").setFontSize(10);
  s.setFrozenRows(1);
  return s;
}

// ── GET: ping ──────────────────────────────────────────────────
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";

  if (action === "ping") {
    return out({ ok: true, msg: "API ok", ts: new Date().toISOString() });
  }

  if (action === "login") {
    return out(loginSiape(e.parameter.siape || ""));
  }

  if (action === "totalPorSala") {
    return out(getTotalPorSala());
  }

  if (action === "checkDuplicate") {
    return out(checkDuplicate(e.parameter.code || ""));
  }

  if (action === "lookupPatrimonio") {
    return out(lookupPatrimonio(e.parameter.code || ""));
  }

  if (action === "buscarPatrimonio") {
    return out(buscarPatrimonio(e.parameter.code || ""));
  }

  if (action === "comparacaoSala") {
    return out(getComparacaoSala(e.parameter.sala || ""));
  }

  if (action === "atualizarDashboard") {
    var TOKEN_ESPERADO = 'inv-ifms-2394174';
    if ((e.parameter.token || '') !== TOKEN_ESPERADO) {
      return out({ ok: false, erro: 'Não autorizado' });
    }
    try {
      var items = JSON.parse(decodeURIComponent(e.parameter.data || "[]"));
      if (items.length) batchSync(items);
    } catch(ex) {}
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    atualizarDashboard(ss);
    return out({ ok: true, msg: "Dashboard atualizado" });
  }

  return out({ ok: false, erro: "Ação desconhecida: " + action });
}

// ── POST: recebe form-encoded do PWA ───────────────────────────
// O app envia: action=batchSync&data=[...]
// Content-Type: application/x-www-form-urlencoded (sem preflight CORS)
function doPost(e) {
  try {
    var action, items;

    var fotoData = null;

    // Tenta ler como form params (application/x-www-form-urlencoded)
    if (e.parameter && e.parameter.action) {
      action = e.parameter.action;
      if (action === "batchSync") {
        items = JSON.parse(e.parameter.data || "[]");
      } else if (action === "descreverFoto") {
        fotoData = JSON.parse(e.parameter.data || "{}");
      }
    }
    // Fallback: JSON puro no body (text/plain)
    else if (e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      action   = body.action;
      items    = body.items || [];
      if (action === "descreverFoto") {
        fotoData = body.data || {};
      }
    }

    if (action === "batchSync") {
      return out(batchSync(items));
    }

    if (action === "testIA") {
      return out(testIA());
    }

    if (action === "descreverFoto") {
      var mime = fotoData && fotoData.mime ? fotoData.mime : "image/jpeg";
      var b64  = fotoData && fotoData.b64  ? fotoData.b64  : "";
      var descricao = descreverFoto(mime, b64);
      if (descricao && descricao.indexOf('ERRO') === 0) {
        return out({ ok: false, erro: descricao }); // retorna erro detalhado
      }
      return out(descricao ? { ok: true, descricao: descricao } : { ok: false, erro: "IA não retornou texto" });
    }

    return out({ ok: false, erro: "Ação desconhecida: " + action });
  } catch(err) {
    return out({ ok: false, erro: err.toString() });
  }
}

function batchSync(items) {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var shInv   = getOrCreate(ss, CFG.ABA_INV,   ["Data/Hora","Código","Local","Sync em"],["#1a1d27","#4f8cff"]);
  var shNoPat = getOrCreate(ss, CFG.ABA_NOPAT, ["Data/Hora","Local","Descrição","Estado","Foto","Sync em"],["#1a1d27","#f59e0b"]);
  var shLog   = getOrCreate(ss, CFG.ABA_LOG,   ["Data/Hora","ID","Tipo","Código","Local","Desc","Estado","Sync em"],["#1a1d27","#8891b0"]);
  var agora   = new Date();
  var ok      = 0;

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    try {
      var ts = item.ts ? new Date(item.ts) : agora;
      if (item.type === "scan") {
        shInv.appendRow([ts, item.code, item.room, item.funcionario||'', item.siape||'', agora]);
        shInv.getRange(shInv.getLastRow(), 1, 1, 6).setBackground("#d8f3dc");
        // Marca como encontrado na lista do SUAP
        marcarEncontrado(item.code, item.room, item.funcionario||'', item.siape||'');
      } else if (item.type === "nopat") {
        var fotoLink = "";
        if (item.photo && item.photo.length > 10) {
          try { fotoLink = salvarFotoDrive(item.photo, item.id, item.room); } catch(ef) { fotoLink = "erro: "+ef.toString(); }
        }
        // Coloca "" na coluna foto — preenchemos depois com rich text
        shNoPat.appendRow([ts, item.room, item.desc, item.estado, "", "", item.funcionario||"", item.siape||"", agora]);
        var ultimaLn = shNoPat.getLastRow();
        shNoPat.getRange(ultimaLn, 1, 1, 9).setBackground("#fff9db");
        if (fotoLink && fotoLink.indexOf("http") === 0) {
          // Converte URL do Drive para URL direta de visualização (para =IMAGE funcionar)
          var fileId = fotoLink.match(/[a-zA-Z0-9_-]{25,}/);
          if (fileId) {
            var fid = fileId[0];
            // Insere imagem diretamente na célula via CellImage API
            // (evita problemas de separador regional com fórmulas)
            try {
              var cellImg = SpreadsheetApp.newCellImage()
                .setSourceUrl("https://drive.google.com/thumbnail?id=" + fid + "&sz=w300")
                .setAltTextTitle(item.desc || "foto")
                .build();
              shNoPat.getRange(ultimaLn, 5).setValue(cellImg);
            } catch(imgErr) {
              // Fallback: rich text com link
              var rt = SpreadsheetApp.newRichTextValue()
                .setText("📷 Ver foto")
                .setLinkUrl(fotoLink)
                .build();
              shNoPat.getRange(ultimaLn, 5).setRichTextValue(rt);
            }
            shNoPat.getRange(ultimaLn, 5).setNote(fotoLink);
            var linkRt2 = SpreadsheetApp.newRichTextValue()
              .setText("🔗 Abrir foto")
              .setLinkUrl(fotoLink)
              .build();
            shNoPat.getRange(ultimaLn, 6).setRichTextValue(linkRt2);
            shNoPat.setRowHeight(ultimaLn, 135);
            // Link clicável na coluna ao lado
            var linkRt = SpreadsheetApp.newRichTextValue()
              .setText("🔗 Abrir foto")
              .setLinkUrl(fotoLink)
              .build();
            shNoPat.getRange(ultimaLn, 6).setRichTextValue(linkRt);
          } else {
            shNoPat.getRange(ultimaLn, 5).setValue(fotoLink);
          }
        } else if (fotoLink) {
          shNoPat.getRange(ultimaLn, 5).setValue(fotoLink);
        }
      }
      shLog.appendRow([ts, item.id, item.type, item.code||"", item.room, item.desc||"", item.estado||"", agora]);
      ok++;
    } catch(e2) {
      shLog.appendRow([agora, "ERRO", item.type||"", item.code||"", "", e2.toString(), "", agora]);
    }
  }
  return { ok: true, sincronizados: ok };
}

function getOrCreate(ss, nome, cab, cores) {
  return ss.getSheetByName(nome) || criarAba(ss, nome, cab, cores);
}

function resumo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var i  = ss.getSheetByName(CFG.ABA_INV);
  var n  = ss.getSheetByName(CFG.ABA_NOPAT);
  atualizarDashboard(ss);
  SpreadsheetApp.getUi().alert(
    "📊 Resumo\n\n✅ Patrimônios: "    + (i ? Math.max(0,i.getLastRow()-1) : 0) +
    "\n📸 Sem patrimônio: " + (n ? Math.max(0,n.getLastRow()-1) : 0)
  );
}

function resetar() {
  var ui = SpreadsheetApp.getUi();

  // Aviso 1
  var r1 = ui.alert(
    '🚨 ATENÇÃO — AÇÃO IRREVERSÍVEL',
    'Você está prestes a APAGAR TODO O INVENTÁRIO.\n\n' +
    'Isso irá:\n' +
    '• Apagar todos os scans da aba Inventário\n' +
    '• Apagar todos os itens sem patrimônio\n' +
    '• Desmarcar todos os patrimônios encontrados\n' +
    '• Limpar o Log\n\n' +
    'Esta ação NÃO pode ser desfeita.\n\nTem certeza?',
    ui.ButtonSet.YES_NO
  );
  if (r1 !== ui.Button.YES) return;

  // Aviso 2 — confirmação final
  var r2 = ui.alert(
    '⚠️ CONFIRMAÇÃO FINAL',
    'Digite "CONFIRMAR" para prosseguir.\n\n(Clique OK apenas se tiver certeza absoluta)',
    ui.ButtonSet.OK_CANCEL
  );
  if (r2 !== ui.Button.OK) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Limpa abas de inventário
  [CFG.ABA_INV, CFG.ABA_NOPAT, CFG.ABA_LOG].forEach(function(nome) {
    var s = ss.getSheetByName(nome);
    if (s && s.getLastRow() > 1) {
      s.getRange(2, 1, s.getLastRow()-1, s.getLastColumn()).clearContent();
    }
  });

  // Desmarca todos os patrimônios encontrados
  var shPat = ss.getSheetByName(CFG.ABA_PAT);
  if (shPat && shPat.getLastRow() > 1) {
    var nRows = shPat.getLastRow() - 1;
    shPat.getRange(2, 5, nRows, 3).clearContent().setBackground(null).setFontColor(null);
  }

  // Atualiza dashboard
  atualizarDashboard(ss);

  ui.alert('✅ Reset concluído. Todos os dados de inventário foram apagados e patrimônios desmarcados.');
}


function salvarFotoDrive(base64data, itemId, local) {
  // Remove prefixo "data:image/jpeg;base64," se houver
  var dados = base64data;
  var mimeType = "image/jpeg";
  if (base64data.indexOf(",") > -1) {
    var partes = base64data.split(",");
    dados = partes[1];
    var header = partes[0];
    if (header.indexOf("png") > -1)  mimeType = "image/png";
    if (header.indexOf("webp") > -1) mimeType = "image/webp";
  }

  var blob     = Utilities.newBlob(Utilities.base64Decode(dados), mimeType, "item_"+itemId+".jpg");
  var pasta    = obterPastaInventario(local);
  var arquivo  = pasta.createFile(blob);
  arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return arquivo.getUrl();
}

// Cria/reutiliza pasta raiz e subpasta por local
function obterPastaInventario(local) {
  // Pasta raiz
  var nomeRaiz = "Inventário Campus - Fotos";
  var raiz;
  var pastasRaiz = DriveApp.getFoldersByName(nomeRaiz);
  raiz = pastasRaiz.hasNext() ? pastasRaiz.next() : DriveApp.createFolder(nomeRaiz);

  // Subpasta pelo nome do local (sala, diretoria, etc)
  var nomeLocal = local ? local.trim() : "Sem local";
  // Remove caracteres inválidos para nome de pasta
  nomeLocal = nomeLocal.replace(/[/:*?"<>|]/g, '-');
  var subpastas = raiz.getFoldersByName(nomeLocal);
  if (subpastas.hasNext()) return subpastas.next();
  return raiz.createFolder(nomeLocal);
}

// ── Chave Gemini — só fica aqui no servidor ───────────────────
// ── Chave Gemini protegida via PropertiesService ─────────────
// Para configurar: menu → 🔑 Configurar Chave Gemini
function getGeminiKey() {
  return PropertiesService.getScriptProperties().getProperty('GEMINI_KEY') || '';
}

function configurarChaveGemini() {
  var ui  = SpreadsheetApp.getUi();
  var res = ui.prompt('🔑 Configurar Chave Gemini', 'Cole sua chave da API Gemini (AIza...):', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var key = res.getResponseText().trim();
  if (!key || !key.startsWith('AIza')) { ui.alert('Chave inválida. Deve começar com "AIza".'); return; }
  PropertiesService.getScriptProperties().setProperty('GEMINI_KEY', key);
  ui.alert('✅ Chave salva com segurança!\nEla não aparece no código e não pode ser lida por ninguém.');
}

// ── Descreve foto via Gemini ───────────────────────────────────
function descreverFoto(mime, b64) {
  if (!b64 || b64.length < 50) {
    return 'ERRO: imagem muito pequena';
  }

  var PROMPT = 'Descreva o objeto principal da imagem em uma frase curta em português. Inclua tipo, cor e marca se visível. Sem ponto final.';

  // Busca modelos disponíveis dinamicamente
  var modelos = [];
  try {
    var listRes  = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=50',
      { method:'get', headers:{'x-goog-api-key': getGeminiKey()}, muteHttpExceptions:true }
    );
    var listData = JSON.parse(listRes.getContentText());
    (listData.models || []).forEach(function(m) {
      var name    = m.name.replace('models/', '');
      var methods = m.supportedGenerationMethods || [];
      // Só modelos com visão (flash/pro) que suportam generateContent
      if (methods.indexOf('generateContent') > -1 &&
          (name.indexOf('flash') > -1 || name.indexOf('pro') > -1) &&
          name.indexOf('vision') === -1) {
        modelos.push(name);
      }
    });
  } catch(e) {}

  // Fallback se não conseguiu listar
  if (!modelos.length) {
    modelos = ['gemini-2.5-flash', 'gemini-2.5-pro'];
  }

  for (var i = 0; i < modelos.length; i++) {
    var modelo = modelos[i];
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent';

    var payload = {
      contents: [{
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mime || 'image/jpeg', data: b64 } }
        ]
      }],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.2 }
    };

    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': getGeminiKey() },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      var res  = UrlFetchApp.fetch(url, options);
      var raw  = res.getContentText();
      var code = res.getResponseCode();

      Logger.log('Modelo: ' + modelo + ' | Status: ' + code);
      Logger.log(raw.substring(0, 200));

      var data = JSON.parse(raw);
      if (data.error) continue;

      var texto = data.candidates &&
                  data.candidates[0] &&
                  data.candidates[0].content &&
                  data.candidates[0].content.parts &&
                  data.candidates[0].content.parts[0].text;

      if (texto && texto.length > 3) return texto.trim();

    } catch(e) {
      Logger.log('Erro: ' + e.toString());
    }
  }

  return null;
}

// ── Testa a IA e loga tudo na planilha ────────────────────────
function testIA() {
  var log = [];
  var ss  = SpreadsheetApp.getActiveSpreadsheet();

  // Cria aba de log se não existir
  var abaLog = ss.getSheetByName('Log IA') || ss.insertSheet('Log IA');
  abaLog.clearContents();
  abaLog.getRange(1,1,1,2).setValues([['Chave','Valor']]);

  function addLog(chave, valor) {
    log.push([chave, String(valor).substring(0, 500)]);
    abaLog.appendRow([chave, String(valor).substring(0, 500)]);
  }

  addLog('Timestamp', new Date().toISOString());
  addLog('GEMINI_KEY (primeiros 8 chars)', getGeminiKey() ? getGeminiKey().substring(0,8)+'...' : 'VAZIA');

  // Imagem de teste: quadrado verde 1x1 pixel em base64
  var b64Teste = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  var mimeTeste = 'image/png';

  addLog('Tamanho b64 teste', b64Teste.length);

  // Busca modelos disponíveis primeiro
  var modelosDisponiveis = [];
  try {
    var listRes = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=50',
      { method:'get', headers:{'x-goog-api-key': getGeminiKey()}, muteHttpExceptions:true }
    );
    var listData = JSON.parse(listRes.getContentText());
    addLog('Modelos disponíveis (raw)', listRes.getContentText().substring(0,800));
    // Filtra só os que suportam generateContent e têm visão
    (listData.models || []).forEach(function(m) {
      var methods = m.supportedGenerationMethods || [];
      if (methods.indexOf('generateContent') > -1) {
        modelosDisponiveis.push(m.name.replace('models/', ''));
      }
    });
    addLog('Modelos com generateContent', modelosDisponiveis.join(', ') || 'nenhum');
  } catch(e) {
    addLog('Erro ao listar modelos', e.toString());
  }

  // Fallback manual se não conseguiu listar
  if (!modelosDisponiveis.length) {
    modelosDisponiveis = ['gemini-2.5-flash', 'gemini-2.5-pro'];
  }

  var modelos = modelosDisponiveis;

  for (var i = 0; i < modelos.length; i++) {
    var modelo = modelos[i];
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent';
    addLog('Tentando modelo', modelo);
    addLog('URL', url);

    var payload = {
      contents: [{ parts: [
        { text: 'Descreva esta imagem em 1 palavra.' },
        { inline_data: { mime_type: mimeTeste, data: b64Teste } }
      ]}],
      generationConfig: { maxOutputTokens: 20 }
    };

    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': getGeminiKey() },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      var res  = UrlFetchApp.fetch(url, options);
      var code = res.getResponseCode();
      var raw  = res.getContentText();
      addLog('HTTP status [' + modelo + ']', code);
      addLog('Resposta bruta [' + modelo + ']', raw);

      var data = JSON.parse(raw);
      if (data.error) {
        addLog('Erro API [' + modelo + ']', JSON.stringify(data.error));
      } else {
        var texto = data.candidates && data.candidates[0] &&
                    data.candidates[0].content &&
                    data.candidates[0].content.parts &&
                    data.candidates[0].content.parts[0].text;
        addLog('Texto retornado [' + modelo + ']', texto || '(vazio)');
        if (texto) {
          addLog('RESULTADO', 'SUCESSO com ' + modelo);
          return { ok: true, modelo: modelo, texto: texto, logCount: log.length };
        }
      }
    } catch(e) {
      addLog('Exception [' + modelo + ']', e.toString());
    }
  }

  addLog('RESULTADO', 'TODOS OS MODELOS FALHARAM');
  return { ok: false, erro: 'Todos os modelos falharam. Veja aba "Log IA" na planilha.', logCount: log.length };
}

// ── Login por SIAPE ───────────────────────────────────────────
function loginSiape(siape) {
  siape = String(siape).trim().replace(/^0+/, '');
  if (!siape) return { ok: false, erro: "SIAPE não informado" };

  // Tenta cache primeiro (evita ler a planilha a cada login)
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var cache = CacheService.getScriptCache();
  var cached = cache.get('funcionarios');
  var dados;
  if (cached) {
    try { dados = JSON.parse(cached); } catch(e) { dados = null; }
  }
  if (!dados) {
    var sheet = ss.getSheetByName(CFG.ABA_FUNC);
    if (!sheet) return { ok: false, erro: "Aba Funcionários não encontrada. Execute ⚙️ Configurar." };
    dados = sheet.getDataRange().getValues();
    cache.put('funcionarios', JSON.stringify(dados), 300); // cache por 5min
  }
  for (var i = 1; i < dados.length; i++) {
    var patSiape = String(dados[i][0]).trim().replace(/^0+/,'');
      var reqSiape  = String(siape).trim().replace(/^0+/,'');
      if (patSiape === reqSiape && reqSiape.length > 0) {
      var nome = String(dados[i][1]).trim();
      // Busca histórico de scans desse funcionário
      var shInv = ss.getSheetByName(CFG.ABA_INV);
      var scans = [];
      if (shInv) {
        var inv = shInv.getDataRange().getValues();
        for (var j = 1; j < inv.length; j++) {
          if (String(inv[j][4]).trim() === siape) { // coluna SIAPE
            scans.push({
              id:   'srv_' + j,
              type: 'scan',
              code: String(inv[j][1]),
              room: String(inv[j][2]),
              funcionario: nome,
              siape: siape,
              ts:   inv[j][0] ? new Date(inv[j][0]).toISOString() : new Date().toISOString(),
              synced: true
            });
          }
        }
      }
      return { ok: true, nome: nome, siape: siape, scans: scans };
    }
  }
  return { ok: false, erro: "SIAPE não cadastrado. Fale com o gestor." };
}

// ── Dashboard do Gestor ───────────────────────────────────────
function atualizarDashboardMenu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  atualizarDashboard(ss);
  SpreadsheetApp.getUi().alert('Dashboard atualizado!');
}

function atualizarDashboard(ss) {
  var shInv   = ss.getSheetByName(CFG.ABA_INV);
  var shNoPat = ss.getSheetByName(CFG.ABA_NOPAT);
  var shPat   = ss.getSheetByName(CFG.ABA_PAT);

  var shDash = ss.getSheetByName(CFG.ABA_DASH);
  if (!shDash) shDash = ss.insertSheet(CFG.ABA_DASH);
  shDash.clearContents();
  shDash.clearFormats();
  ss.setActiveSheet(shDash);
  ss.moveActiveSheet(1);

  var BG      = '#0f1117';
  var SURFACE = '#1a1d27';
  var BORDER  = '#2e3347';

  function setHeader(range, label, fg) {
    range.setValue(label)
      .setBackground(SURFACE).setFontColor(fg || '#8891b0')
      .setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setBorder(true,true,true,true,false,false,BORDER,SpreadsheetApp.BorderStyle.SOLID);
  }

  function setKpi(range, value, fg) {
    range.setValue(value)
      .setBackground(BG).setFontColor(fg)
      .setFontSize(22).setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBorder(true,true,true,true,false,false,BORDER,SpreadsheetApp.BorderStyle.SOLID);
  }

  var row = 1;

  // ── Título ──────────────────────────────────────────────────
  shDash.getRange(row,1,1,8).merge()
    .setValue('📊 Dashboard — Inventário Campus IFMS')
    .setBackground('#1a1d27').setFontColor('#4f8cff')
    .setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');
  shDash.setRowHeight(row, 40);
  row++;

  shDash.getRange(row,1,1,8).merge()
    .setValue('Atualizado em: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'))
    .setBackground(BG).setFontColor('#8891b0').setFontSize(10).setHorizontalAlignment('center');
  row += 2;

  // ── Coleta dados ─────────────────────────────────────────────
  var invData   = shInv   ? shInv.getDataRange().getValues()   : [];
  var nopatData = shNoPat ? shNoPat.getDataRange().getValues() : [];
  var patData   = shPat   ? shPat.getDataRange().getValues()   : [];

  var totalScans = Math.max(0, invData.length - 1);
  var totalNopat = Math.max(0, nopatData.length - 1);
  var totalPat   = Math.max(0, patData.length - 1);

  // Funcionários únicos
  var funcs = {};
  for (var i = 1; i < invData.length; i++) {
    var f = String(invData[i][3] || '').trim();
    if (f) funcs[f] = (funcs[f] || 0) + 1;
  }

  // Estados conservação
  var estados = {Excelente:0,Bom:0,Regular:0,Ruim:0};
  for (var i = 1; i < nopatData.length; i++) {
    var est = String(nopatData[i][3]||'').trim();
    if (estados[est] !== undefined) estados[est]++;
  }

  // ── KPIs ────────────────────────────────────────────────────
  shDash.getRange(row,1,1,8).merge().setValue('VISÃO GERAL')
    .setBackground(BG).setFontColor('#8891b0').setFontSize(9).setFontWeight('bold');
  row++;

  var kpis = [
    [totalScans + totalNopat, '#4f8cff', 'Total escaneados'],
    [totalPat,                '#8891b0', 'Patrimônios SUAP'],
    [totalPat > 0 ? Math.round((totalScans+totalNopat)/totalPat*100)+'%' : '-', '#22c55e', '% Encontrado'],
    [Object.keys(funcs).length, '#f59e0b', 'Servidores ativos'],
  ];

  for (var ci = 0; ci < kpis.length; ci++) {
    setKpi(shDash.getRange(row, ci*2+1, 1, 2).merge(), kpis[ci][0], kpis[ci][1]);
    shDash.setRowHeight(row, 50);
    shDash.getRange(row+1, ci*2+1, 1, 2).merge()
      .setValue(kpis[ci][2]).setBackground(SURFACE)
      .setFontColor('#8891b0').setFontSize(9).setHorizontalAlignment('center');
  }
  row += 3;

  // ── Barra de progresso geral ─────────────────────────────────
  var totalEnc = 0;
  for (var i = 1; i < patData.length; i++) {
    var rawSt = patData[i][4];
    var st = (rawSt instanceof Date) ? '' : String(rawSt || '').trim();
    if (st === '✅ Encontrado' || st === '🟡 Encontrado em outro local') totalEnc++;
  }
  var pctGeral = totalPat > 0 ? Math.round(totalEnc / totalPat * 100) : 0;
  var barCells = 8; // número de colunas para a barra
  var filled   = Math.round(pctGeral / 100 * barCells);

  shDash.getRange(row,1,1,8).merge()
    .setValue('PROGRESSO GERAL DO INVENTÁRIO')
    .setBackground(BG).setFontColor('#8891b0').setFontSize(9).setFontWeight('bold');
  row++;

  // Label
  shDash.getRange(row,1,1,8).merge()
    .setValue(totalEnc + ' de ' + totalPat + ' patrimônios encontrados (' + pctGeral + '%)')
    .setBackground(BG).setFontColor('#f0f2ff').setFontSize(11)
    .setHorizontalAlignment('center').setFontWeight('bold');
  shDash.setRowHeight(row, 24);
  row++;

  // Barra visual — células coloridas
  for (var ci = 1; ci <= barCells; ci++) {
    var isFilled = ci <= filled;
    shDash.getRange(row, ci)
      .setBackground(isFilled ? '#22c55e' : '#1e2535')
      .setValue('');
  }
  shDash.setRowHeight(row, 18);
  row += 2;

  // ── Progresso por sala (com dados SUAP) ───────────────────────
  shDash.getRange(row,1,1,8).merge().setValue('PROGRESSO POR SALA')
    .setBackground(BG).setFontColor('#8891b0').setFontSize(9).setFontWeight('bold');
  row++;

  var cabSala = ['Sala','Total SUAP','Encontrados','✅ Correto','🟡 Outro local','🔴 Duplic.','❌ Não localiz.','⏳ Pendente','%'];
  shDash.getRange(row,1,1,9).setValues([cabSala])
    .setBackground(SURFACE).setFontColor('#4f8cff').setFontWeight('bold').setFontSize(10);
  shDash.setRowHeight(row, 24);
  row++;

  // Monta mapa de patrimônios por sala
  var patPorSala = {};
  for (var i = 1; i < patData.length; i++) {
    var num    = String(patData[i][0] || '').trim().replace(/\.0$/, '');
    if (!num || num === '0' || num === '') continue; // pula linhas vazias
    var sala   = String(patData[i][2] || '').trim();
    // Garante que status seja sempre string (não Date ou Number)
    var rawStatus = patData[i][4];
    var status = (rawStatus instanceof Date) ? '' : String(rawStatus || '').trim();
    if (!sala) continue;
    if (!patPorSala[sala]) patPorSala[sala] = {total:0,correto:0,outro:0,nao:0,pend:0};
    patPorSala[sala].total++;
    if (status === '✅ Encontrado') {
      patPorSala[sala].correto++;
    } else if (status === '🟡 Encontrado em outro local') {
      patPorSala[sala].outro++;
    } else if (status === '🔴 DUPLICADO') {
      patPorSala[sala].duplicado = (patPorSala[sala].duplicado || 0) + 1;
    } else if (status === '❌ Não localizado') {
      patPorSala[sala].nao++;
    } else {
      patPorSala[sala].pend++;
    }
  }

  var SALA_GRUPO = {"ALMOXARIFADO (Bloco A)": "Bloco A", "APOIO ALMOXARIFADO (Bloco A)": "Bloco A", "BIBLIOTECA (Bloco A)": "Bloco A", "COPA (Bloco A)": "Bloco A", "COORDENAÇÕES (Bloco A)": "Bloco A", "CORREDOR INFERIOR (Bloco A)": "Bloco A", "CORREDOR SUPERIOR (Bloco A)": "Bloco A", "COZINHA (Bloco A)": "Bloco A", "CEREL (Bloco A)": "Bloco A", "DIRAD I (Bloco A)": "Bloco A", "DIRAD II (Bloco A)": "Bloco A", "DIREN (Bloco A)": "Bloco A", "DIRGE (Bloco A)": "Bloco A", "GABINETE (Bloco A)": "Bloco A", "NAPNE (Bloco A)": "Bloco A", "NUGED (Bloco A)": "Bloco A", "Inventário (Bloco A)": "Bloco A", "REFEITORIO SERVIDORES (Bloco A)": "Bloco A", "SALA DE REUNIÕES - Bloco A - Piso Superior (Bloco A)": "Bloco A", "SALA DOS PROFESSORES 1 (Bloco A)": "Bloco A", "SALA DOS PROFESSORES 2 (Bloco A)": "Bloco A", "SALA DOS PROFESSORES 3 (Bloco A)": "Bloco A", "SALA APOIO COALP / COADS (Bloco A)": "Bloco A", "SALA DE APOIO TERCEIRIZADOS (Bloco A)": "Bloco A", "SALA DE ATENDIMENTO NUGED (Bloco A)": "Bloco A", "SHAFT SALA APOIO COALP / COADS (Bloco A)": "Bloco A", "SHAFT CENTRAL INFERIOR BLOCO A (Bloco A)": "Bloco A", "SHAFT CENTRAL BLOCO A SUPERIOR (Bloco A)": "Bloco A", "SHAFT SUPERIOR ESCADA BLOCO A (Bloco A)": "Bloco A", "SHAFT DIRAD 1 (Bloco A)": "Bloco A", "CANTINA (Bloco A)": "Bloco A", "APOIO LABORATÓRIO INFORMÁTICA (Bloco B)": "Bloco B", "DATACENTER (Bloco B)": "Bloco B", "CORREDOR INFERIOR (Bloco B)": "Bloco B", "CORREDOR SUPERIOR (Bloco B)": "Bloco B", "GAMELAB (Bloco B)": "Bloco B", "IFSTUDIO (Bloco B)": "Bloco B", "IFMaker (Bloco B)": "Bloco B", "LABORATÓRIO INFORMÁTICA 1 (Bloco B)": "Bloco B", "LABORATÓRIO INFORMÁTICA 2 (Bloco B)": "Bloco B", "LABORATÓRIO INFORMÁTICA 3 (Bloco B)": "Bloco B", "LABORATÓRIO INFORMÁTICA 4 (Bloco B)": "Bloco B", "LABORATÓRIO INFORMÁTICA 5 (Bloco B)": "Bloco B", "LABORATÓRIO BIOLOGIA/FÍSICA (Bloco B)": "Bloco B", "LABORATÓRIO QUÍMICA/MATEMÁTICA (Bloco B)": "Bloco B", "PÁTIO BLOCO B (Bloco B)": "Bloco B", "SERTI (Bloco B)": "Bloco B", "SHAFT CENTRAL INFERIOR BLOCO B (Bloco B)": "Bloco B", "SHAFT SUPERIOR ESCADA BLOCO B (Bloco B)": "Bloco B", "SHAFT LABORATÓRIO INFORMÁTICA 4 (Bloco B)": "Bloco B", "ESTUDIO 1 (Bloco B)": "Bloco B", "ESTUDIO 2 (Bloco B)": "Bloco B", "SALA VAGA (Bloco B)": "Bloco B", "SL 01 (BLOCO C)": "Bloco C", "SL 02 (BLOCO C)": "Bloco C", "SL 03 (BLOCO C)": "Bloco C", "SL 04 (BLOCO C)": "Bloco C", "SL 05 (BLOCO C)": "Bloco C", "SL 06 (BLOCO C)": "Bloco C", "SL 07 (BLOCO C)": "Bloco C", "SL 08 (BLOCO C)": "Bloco C", "SL 09 (BLOCO C)": "Bloco C", "SL 10 (BLOCO C)": "Bloco C", "ENFERMARIA (BLOCO C)": "Bloco C", "ASSISTENTE DE ALUNOS (BLOCO C)": "Bloco C", "LÓGICA (BLOCO C)": "Bloco C", "CORREDOR E HALL BLOCO C (BLOCO C)": "Bloco C", "HALL E CORREDOR (BLOCO C)": "Bloco C", "PERMANÊNCIA ESTUDANTIL (BLOCO C)": "Bloco C", "Sala de Artes (SALAS MODULARES)": "Salas Modulares", "LAFIF - Laboratório de Atividades Físicas (SALAS MODULARES)": "Salas Modulares", "Laboratório de Humanas (SALAS MODULARES)": "Salas Modulares", "CENID (SALAS MODULARES)": "Salas Modulares", "M-01 (SALAS MODULARES)": "Salas Modulares", "ROBÓTICA (SALAS MODULARES)": "Salas Modulares", "TECNOIF DR (SALAS MODULARES)": "Salas Modulares", "ÁREA DAS SALAS MODULARES (SALAS MODULARES)": "Salas Modulares", "ALMOXARIFADO CONTAINER (ÁREA EXTERNA)": "Área Externa", "PATRIMÔNIO CONTAINER (ÁREA EXTERNA)": "Área Externa", "CONTAINER QUADRA (QUADRA POLIESPORTIVA)": "Área Externa", "QUADRA POLIESPORTIVA (DR) (ÁREA EXTERNA)": "Área Externa", "BOSQUE (BOSQUE)": "Área Externa", "ESTACIONAMENTO VEÍCULOS OFICIAIS (ESTACIONAMENTO)": "Área Externa", "ESTACIONAMENTO GERAL (ESTACIONAMENTO)": "Área Externa", "GUARITA (GUARITA)": "Área Externa", "ENTRADA DOS ESTUDANTES (ÁREA EXTERNA)": "Área Externa", "BARRACÃO (PÁTIO EXTERNO FUNDOS.)": "Área Externa", "CRC (BARRACÃO CRC)": "Área Externa", "ÁREA DE CONVIVÊNCIA (ÁREA DE CONVIVÊNCIA ENTRE BLOCOS A-B)": "Área Externa"};
  var ORDEM_GRUPOS = ['Bloco A','Bloco B','Bloco C','Salas Modulares','Área Externa','Outros'];

  // Agrupa salas por bloco
  var porBloco = {};
  Object.keys(patPorSala).forEach(function(sala) {
    var g = SALA_GRUPO[sala] || 'Outros';
    if (!porBloco[g]) porBloco[g] = [];
    porBloco[g].push(sala);
  });

  ORDEM_GRUPOS.forEach(function(grupo) {
    var salasGrupo = porBloco[grupo];
    if (!salasGrupo || !salasGrupo.length) return;

    // Cabeçalho do grupo
    shDash.getRange(row,1,1,8).merge()
      .setValue('▸ ' + grupo)
      .setBackground('#1a1d27').setFontColor('#7c5cfc')
      .setFontWeight('bold').setFontSize(10);
    shDash.setRowHeight(row, 22);
    row++;

    // Salas do grupo ordenadas por total
    salasGrupo.sort(function(a,b){ return patPorSala[b].total - patPorSala[a].total; });

    salasGrupo.forEach(function(sala, idx) {
      var d   = patPorSala[sala];
      var enc = d.correto + d.outro;
      var pct = d.total > 0 ? Math.round(enc / d.total * 100) : 0;
      var bg  = idx % 2 === 0 ? BG : SURFACE;
      var corPct = pct >= 90 ? '#22c55e' : pct >= 50 ? '#4f8cff' : '#f59e0b';

      var dup = d.duplicado || 0;
      shDash.getRange(row, 1, 1, 9).setValues([[
        '  ' + sala, d.total, enc, d.correto, d.outro, dup, d.nao, d.pend, pct + '%'
      ]]).setBackground(bg).setFontColor('#f0f2ff').setFontSize(10);

      shDash.getRange(row, 9).setFontColor(corPct).setFontWeight('bold').setNumberFormat('@');
      for (var cn = 2; cn <= 8; cn++) shDash.getRange(row, cn).setNumberFormat('0');
      if (d.correto > 0) shDash.getRange(row, 4).setFontColor('#22c55e');
      if (d.outro > 0)   shDash.getRange(row, 5).setFontColor('#f59e0b');
      if (dup > 0)       shDash.getRange(row, 6).setFontColor('#ef4444').setFontWeight('bold');
      if (d.nao > 0)     shDash.getRange(row, 7).setFontColor('#ef4444');
      shDash.setRowHeight(row, 20);
      row++;
    });
    row++; // espaço entre grupos
  });
  row++;

  // ── Atividade por servidor ───────────────────────────────────
  shDash.getRange(row,1,1,8).merge().setValue('ATIVIDADE POR SERVIDOR')
    .setBackground(BG).setFontColor('#8891b0').setFontSize(9).setFontWeight('bold');
  row++;
  shDash.getRange(row,1,1,4).setValues([['Servidor','SIAPE','Itens','Último registro']])
    .setBackground(SURFACE).setFontColor('#f59e0b').setFontWeight('bold').setFontSize(10);
  row++;

  var porFunc = {};
  for (var i = 1; i < invData.length; i++) {
    var fn = String(invData[i][3] || '').trim();
    var sp = String(invData[i][4] || '').trim();
    var ts = invData[i][0];
    // Ignora linhas com valores claramente errados (sem nome ou SIAPE)
    if (!fn || fn.length < 2) continue;
    if (!porFunc[fn]) porFunc[fn] = {siape:sp, count:0, ultimo:null};
    porFunc[fn].count++;
    // Só atualiza timestamp se for uma data válida
    if (ts instanceof Date && !isNaN(ts)) {
      if (!porFunc[fn].ultimo || ts > porFunc[fn].ultimo) porFunc[fn].ultimo = ts;
    }
  }

  Object.keys(porFunc).sort(function(a,b){ return porFunc[b].count - porFunc[a].count; })
  .forEach(function(fn, idx) {
    var d = porFunc[fn];
    var bg = idx % 2 === 0 ? BG : SURFACE;
    var ult = d.ultimo ? Utilities.formatDate(d.ultimo, Session.getScriptTimeZone(), 'dd/MM HH:mm') : '-';
    // Força número inteiro na coluna Itens e texto nas demais
    var r = shDash.getRange(row,1,1,4);
    r.setValues([[fn, d.siape, d.count, ult]])
     .setBackground(bg).setFontColor('#f0f2ff').setFontSize(10);
    // Garante formato número na coluna Itens, texto nas outras
    shDash.getRange(row,3).setNumberFormat('0');
    shDash.getRange(row,1).setNumberFormat('@');
    shDash.getRange(row,2).setNumberFormat('@');
    shDash.getRange(row,4).setNumberFormat('@');
    row++;
  });
  row++;

  // ── Estado de conservação ────────────────────────────────────
  shDash.getRange(row,1,1,4).merge().setValue('ESTADO DE CONSERVAÇÃO (Sem Patrimônio)')
    .setBackground(BG).setFontColor('#8891b0').setFontSize(9).setFontWeight('bold');
  row++;
  shDash.getRange(row,1,1,3).setValues([['Estado','Qtd','%']])
    .setBackground(SURFACE).setFontColor('#7c5cfc').setFontWeight('bold').setFontSize(10);
  row++;

  var coresEst = {Excelente:'#22c55e',Bom:'#4f8cff',Regular:'#f59e0b',Ruim:'#ef4444'};
  Object.keys(estados).forEach(function(est) {
    var qtd = estados[est];
    var pct = totalNopat > 0 ? Math.round(qtd/totalNopat*100) : 0;
    shDash.getRange(row,1,1,3).setValues([[est, qtd, pct+'%']])
      .setBackground(BG).setFontColor(coresEst[est]||'#f0f2ff').setFontSize(10);
    row++;
  });

  // ── Formatação final ─────────────────────────────────────────
  shDash.setColumnWidth(1, 260);
  shDash.setColumnWidth(2, 90);
  shDash.setColumnWidth(3, 100);
  shDash.setColumnWidth(4, 90);
  shDash.setColumnWidth(5, 100);
  shDash.setColumnWidth(6, 110);
  shDash.setColumnWidth(7, 90);
  shDash.setColumnWidth(8, 90);
  shDash.setColumnWidth(9, 60);
  shDash.setTabColor('#4f8cff');

  Logger.log('Dashboard atualizado: ' + (totalScans+totalNopat) + ' itens, ' + Object.keys(patPorSala).length + ' salas');
}


// ── Concluir Inventário ───────────────────────────────────────
function concluirInventario() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    '✅ Concluir Inventário',
    'Isso vai marcar todos os itens não localizados como "Não localizado" e atualizar o dashboard.\n\nTem certeza?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CFG.ABA_PAT);
  if (!sh) { ui.alert('Aba Patrimônios não encontrada.'); return; }

  var dados = sh.getDataRange().getValues();
  var ts    = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  var count = 0;

  for (var i = 1; i < dados.length; i++) {
    var status = String(dados[i][4] || '').trim();
    if (!status) {
      sh.getRange(i+1, 5).setValue('❌ Não localizado')
        .setBackground('#2d0f0f').setFontColor('#ef4444');
      sh.getRange(i+1, 7).setValue('Concluído em ' + ts);
      count++;
    }
  }

  // Atualiza dashboard
  atualizarDashboard(ss);

  ui.alert('Inventario concluido! ' + count + ' itens marcados como Nao localizado. Dashboard atualizado.');
}

// ── Comparação por sala — retorna TODAS as salas de uma vez ──
// Cliente faz filtragem local, evitando múltiplas leituras da planilha
function getComparacaoSala(sala) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CFG.ABA_PAT);
  if (!sh) return { ok: false, erro: 'Aba Patrimônios não encontrada.' };

  // Lê tudo de uma vez
  var dados = sh.getDataRange().getValues();
  var porSala = {};

  for (var i = 1; i < dados.length; i++) {
    var salaSuap    = String(dados[i][2] || '').trim();
    if (!salaSuap) continue;
    var status      = String(dados[i][4] || '').trim();
    var localAchado = String(dados[i][5] || '').trim();
    var quemAchou   = String(dados[i][6] || '').trim();

    var tipo = 'pendente';
    if (status.indexOf('Encontrado') > -1 || status.indexOf('outro local') > -1) {
      tipo = localAchado && localAchado !== salaSuap ? 'outro_local' : 'correto';
    } else if (status.indexOf('localizado') > -1) {
      tipo = 'nao_localizado';
    }

    if (!porSala[salaSuap]) porSala[salaSuap] = [];
    porSala[salaSuap].push([
      String(dados[i][0]),              // numero
      String(dados[i][1] || '').substring(0, 80), // desc
      tipo,
      localAchado,
      quemAchou.split(' · ')[0]        // só nome, sem data
    ]);
  }

  return { ok: true, porSala: porSala };
}

// ── Simulação de inventário real ─────────────────────────────
function simularInventario() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    '🧪 Simular Inventário',
    'Isso vai:\n' +
    '1. Limpar as abas Inventário e Sem Patrimônio\n' +
    '2. Resetar status da aba Patrimônios SUAP\n' +
    '3. Simular 10 servidores escaneando ~65% dos itens\n' +
    '4. Gerar relatório de verificação\n\n' +
    'Continuar?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var shInv  = ss.getSheetByName(CFG.ABA_INV);
  var shPat  = ss.getSheetByName(CFG.ABA_PAT);
  var shFunc = ss.getSheetByName(CFG.ABA_FUNC);

  if (!shPat) { ui.alert('Importe os patrimônios do SUAP primeiro.'); return; }

  // ── 1. Limpa inventário ──────────────────────────────────────
  if (shInv && shInv.getLastRow() > 1) {
    shInv.getRange(2, 1, shInv.getLastRow()-1, shInv.getLastColumn()).clearContent();
  }

  // ── 2. Reseta status dos patrimônios ─────────────────────────
  var patData = shPat.getDataRange().getValues();
  for (var i = 1; i < patData.length; i++) {
    shPat.getRange(i+1, 5, 1, 3).clearContent().setBackground(null).setFontColor(null);
  }

  // ── 3. Define 10 servidores fictícios ────────────────────────
  var servidores = [
    {nome: 'Ana Silva',      siape: '1111001'},
    {nome: 'Bruno Costa',    siape: '1111002'},
    {nome: 'Carlos Melo',    siape: '1111003'},
    {nome: 'Daniela Souza',  siape: '1111004'},
    {nome: 'Eduardo Lima',   siape: '1111005'},
    {nome: 'Fernanda Rocha', siape: '1111006'},
    {nome: 'Gabriel Nunes',  siape: '1111007'},
    {nome: 'Helena Pires',   siape: '1111008'},
    {nome: 'Igor Santos',    siape: '1111009'},
    {nome: 'Julia Ferreira', siape: '1111010'},
  ];

  // ── 4. Distribui salas entre servidores ───────────────────────
  // Pega salas únicas do SUAP
  var salasMap = {};
  for (var i = 1; i < patData.length; i++) {
    var sala = String(patData[i][2] || '').trim();
    if (sala) salasMap[sala] = true;
  }
  var todasSalas = Object.keys(salasMap);

  // Embaralha salas
  for (var i = todasSalas.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = todasSalas[i]; todasSalas[i] = todasSalas[j]; todasSalas[j] = tmp;
  }

  // Divide salas entre servidores (~8-9 salas por servidor)
  var salasPorServidor = {};
  servidores.forEach(function(s){ salasPorServidor[s.siape] = []; });
  todasSalas.forEach(function(sala, idx) {
    var srv = servidores[idx % servidores.length];
    salasPorServidor[srv.siape].push(sala);
  });

  // ── 5. Simula scans (~65% dos itens por sala) ────────────────
  var totalSimulado = 0;
  var totalOutroLocal = 0;
  var ts = new Date();

  for (var i = 1; i < patData.length; i++) {
    var num  = String(patData[i][0] || '').trim();
    var sala = String(patData[i][2] || '').trim();
    if (!num || !sala) continue;

    // 65% de chance de ser escaneado
    if (Math.random() > 0.65) continue;

    // Encontra servidor responsável por essa sala
    var servidor = null;
    for (var si = 0; si < servidores.length; si++) {
      if (salasPorServidor[servidores[si].siape].indexOf(sala) > -1) {
        servidor = servidores[si];
        break;
      }
    }
    if (!servidor) servidor = servidores[0];

    // 5% de chance de estar em sala errada (outro local)
    var salaReal = sala;
    if (Math.random() < 0.05 && todasSalas.length > 1) {
      var outraSala = todasSalas[Math.floor(Math.random() * todasSalas.length)];
      if (outraSala !== sala) {
        salaReal = outraSala;
        totalOutroLocal++;
      }
    }

    // Grava na aba Inventário
    ts = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 3600 * 1000));
    var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    shInv.appendRow([
      Utilities.formatDate(ts, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
      num, salaReal, servidor.nome, servidor.siape, agora
    ]);

    // Marca na aba Patrimônios
    var outroLocal = salaReal !== sala;
    if (outroLocal) {
      shPat.getRange(i+1,5).setValue('🟡 Encontrado em outro local').setBackground('#2d2200').setFontColor('#f59e0b');
    } else {
      shPat.getRange(i+1,5).setValue('✅ Encontrado').setBackground('#0f2d1f').setFontColor('#22c55e');
    }
    shPat.getRange(i+1,6).setValue(salaReal);
    shPat.getRange(i+1,7).setValue(agora + ' · ' + servidor.nome + ' (' + servidor.siape + ')');

    totalSimulado++;
  }

  // ── 6. Atualiza dashboard ─────────────────────────────────────
  atualizarDashboard(ss);

  // ── 7. Relatório de verificação ───────────────────────────────
  var totalPat      = patData.length - 1;
  var pctSimulado   = Math.round(totalSimulado / totalPat * 100);

  // Verifica contagem real no dashboard
  var shDash = ss.getSheetByName(CFG.ABA_DASH);
  var erros  = [];

  // Verifica se total escaneado bate
  if (shInv.getLastRow() - 1 !== totalSimulado) {
    erros.push('❌ Inventário: ' + (shInv.getLastRow()-1) + ' linhas vs ' + totalSimulado + ' simulados');
  } else {
    erros.push('✅ Inventário: ' + totalSimulado + ' itens gravados corretamente');
  }

  // Conta encontrados na aba Patrimônios
  var encPat = 0; var outroPat = 0; var pendPat = 0;
  var patRecheck = shPat.getDataRange().getValues();
  for (var i = 1; i < patRecheck.length; i++) {
    var st = String(patRecheck[i][4] || '').trim();
    if (st === '✅ Encontrado') encPat++;
    else if (st === '🟡 Encontrado em outro local') outroPat++;
    else if (!st) pendPat++;
  }

  erros.push('✅ Encontrados corretos: ' + encPat);
  erros.push('✅ Encontrados outro local: ' + outroPat + ' (esperado ~' + totalOutroLocal + ')');
  erros.push('✅ Pendentes: ' + pendPat);
  erros.push('✅ Total patrimônios: ' + totalPat);
  erros.push('📊 % simulado: ' + pctSimulado + '% (alvo: ~65%)');

  ui.alert(
    '🧪 Simulação concluída!',
    erros.join('\n') + '\n\nDashboard atualizado. Verifique a aba 📊 Dashboard.',
    ui.ButtonSet.OK
  );
}

// ── Importar Patrimônios do SUAP ─────────────────────────────
function importarPatrimonios() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shBruto = ss.getSheetByName('SUAP_Bruto');
  if (!shBruto) {
    SpreadsheetApp.getUi().alert('Aba "SUAP_Bruto" não encontrada!\n\nPassos:\n1. Arquivo → Importar\n2. Selecione o xlsx do SUAP\n3. Escolha "Inserir nova planilha"\n4. Renomeie para "SUAP_Bruto"\n5. Clique em Processar novamente');
    return;
  }
  var dados = shBruto.getDataRange().getValues();
  if (dados.length < 2) { SpreadsheetApp.getUi().alert('A aba SUAP_Bruto está vazia.'); return; }

  var header = dados[0].map(function(h){ return String(h).toUpperCase().trim(); });
  var iNum  = header.indexOf('NUMERO');
  var iDesc = header.indexOf('DESCRICAO');
  var iSala = header.findIndex ? header.findIndex(function(h){ return h.indexOf('SALA') > -1; }) : -1;
  var iEst  = header.findIndex ? header.findIndex(function(h){ return h.indexOf('ESTADO') > -1; }) : -1;

  if (iNum === -1) iNum = 0;
  if (iDesc === -1) iDesc = 1;

  var sh = ss.getSheetByName(CFG.ABA_PAT);
  if (!sh) sh = ss.insertSheet(CFG.ABA_PAT);
  sh.clearContents(); sh.clearFormats();
  sh.getRange(1,1,1,7).setValues([['Nº Patrimônio','Descrição','Sala SUAP','Estado SUAP','Encontrado','Local encontrado','Data/Servidor']])
    .setBackground('#1a1d27').setFontColor('#f59e0b').setFontWeight('bold').setFontSize(10);
  sh.setFrozenRows(1);

  var rows = [];
  for (var i = 1; i < dados.length; i++) {
    var num = String(dados[i][iNum] || '').trim().replace(/\.0$/, '');
    if (!num) continue;
    var desc = String(dados[i][iDesc] || '').replace(/[\r\n]+/g, ' ').replace(/_x000D_/g, '').trim();

    var bi = desc.indexOf('['); if (bi > 0) desc = desc.substring(0, bi).trim();
    if (desc.length > 200) desc = desc.substring(0, 200);
    var sala = iSala > -1 ? String(dados[i][iSala] || '').trim() : '';
    var est  = iEst  > -1 ? String(dados[i][iEst]  || '').trim() : '';
    rows.push([num, desc, sala, est, '', '', '']);
  }

  if (rows.length) {
    sh.getRange(2,1,rows.length,7).setValues(rows);
    sh.getRange(2,1,rows.length,1).setNumberFormat('@');
  }
  sh.setColumnWidth(1,120); sh.setColumnWidth(2,380); sh.setColumnWidth(3,220);
  sh.setColumnWidth(4,120); sh.setColumnWidth(5,120); sh.setColumnWidth(6,180); sh.setColumnWidth(7,200);
  sh.setTabColor('#f59e0b');
  SpreadsheetApp.getUi().alert('✅ ' + rows.length + ' patrimônios importados!');
}

// ── Marcar patrimônio como encontrado ────────────────────────
function marcarEncontrado(numero, localApp, funcionario, siape) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CFG.ABA_PAT);
  if (!sh) return { encontrado: false };

  var numStr = String(numero).replace(/^0+/, '').trim();
  var dados  = sh.getDataRange().getValues();

  for (var i = 1; i < dados.length; i++) {
    var pat = String(dados[i][0]).replace(/^0+/, '').replace(/\.0$/, '').trim();
    if (pat !== numStr) continue;

    var salaOriginal  = String(dados[i][2]).trim();
    var statusAtual   = String(dados[i][4] || '').trim();
    var localAnterior = String(dados[i][5] || '').trim();
    var quemAnterior  = String(dados[i][6] || '').trim();
    var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    var registro = ts + ' · ' + funcionario + ' (' + siape + ')';

    // Já foi marcado por outro servidor?
    var jaMarcado = statusAtual && statusAtual !== '';
    if (jaMarcado) {
      // Duplicidade! Marca em vermelho com ambos os locais
      sh.getRange(i+1,5).setValue('🔴 DUPLICADO').setBackground('#2d0a0a').setFontColor('#ef4444').setFontWeight('bold');
      sh.getRange(i+1,6).setValue(localAnterior + ' → ' + localApp);
      sh.getRange(i+1,7).setValue(quemAnterior + ' | ' + registro);
      return {
        encontrado: true,
        duplicado:  true,
        localAnterior: localAnterior,
        quemAnterior:  quemAnterior,
        salaOriginal:  salaOriginal
      };
    }

    var outroLocal = localApp && localApp !== salaOriginal;
    if (outroLocal) {
      sh.getRange(i+1,5).setValue('🟡 Encontrado em outro local').setBackground('#2d2200').setFontColor('#f59e0b');
    } else {
      sh.getRange(i+1,5).setValue('✅ Encontrado').setBackground('#0f2d1f').setFontColor('#22c55e');
    }
    sh.getRange(i+1,6).setValue(localApp);
    sh.getRange(i+1,7).setValue(registro);

    return { encontrado: true, duplicado: false, outroLocal: outroLocal, descricao: String(dados[i][1]), salaOriginal: salaOriginal };
  }
  return { encontrado: false };
}

// ── Total de patrimônios por sala ────────────────────────────
function getTotalPorSala() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CFG.ABA_PAT);
  if (!sh) return { ok: false, erro: 'Aba Patrimônios não encontrada.' };

  var dados = sh.getDataRange().getValues();
  var porSala = {}, encontrados = {};

  for (var i = 1; i < dados.length; i++) {
    var sala = String(dados[i][2] || '').trim();
    if (!sala) continue;
    porSala[sala] = (porSala[sala] || 0) + 1;
    var rawSt = dados[i][4];
    var st = (rawSt instanceof Date) ? '' : String(rawSt || '').trim();
    if (st === '✅ Encontrado' || st === '🟡 Encontrado em outro local') {
      encontrados[sala] = (encontrados[sala] || 0) + 1;
    }
  }
  return { ok: true, porSala: porSala, encontrados: encontrados };
}

// ── Verifica duplicidade no servidor ─────────────────────────
function checkDuplicate(code) {
  if (!code) return { ok: true, duplicado: false };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sh   = ss.getSheetByName(CFG.ABA_INV);
  if (!sh || sh.getLastRow() < 2) return { ok: true, duplicado: false };

  var numStr = String(code).replace(/^0+/, '').trim();
  var dados  = sh.getDataRange().getValues();

  for (var i = 1; i < dados.length; i++) {
    var pat = String(dados[i][1] || '').replace(/^0+/, '').trim();
    if (pat === numStr) {
      return {
        ok: true,
        duplicado: true,
        sala:       String(dados[i][2] || ''),
        funcionario: String(dados[i][3] || ''),
        siape:      String(dados[i][4] || ''),
        data:       String(dados[i][0] || '')
      };
    }
  }
  return { ok: true, duplicado: false };
}

// ── Busca descrição do patrimônio no SUAP ────────────────────
function lookupPatrimonio(code) {
  if (!code) return { ok: false };
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName(CFG.ABA_PAT);
  if (!sh) return { ok: false };

  var numStr = String(code).replace(/^0+/, '').trim();
  var dados  = sh.getDataRange().getValues();

  for (var i = 1; i < dados.length; i++) {
    var pat = String(dados[i][0] || '').replace(/^0+/, '').replace(/\.0$/, '').trim();
    if (pat === numStr) {
      return {
        ok:          true,
        numero:      String(dados[i][0]),
        descricao:   String(dados[i][1] || '').substring(0, 80),
        salaOriginal: String(dados[i][2] || ''),
        estado:      String(dados[i][3] || ''),
        status:      String(dados[i][4] || '')
      };
    }
  }
  return { ok: true, encontrado: false };
}

// ── Corrige sala de itens específicos no Inventário ─────────
function corrigirSalaInventario(ids, novaSala) {
  if (!ids || !ids.length || !novaSala) return { ok: false, erro: 'Parâmetros inválidos' };

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sh   = ss.getSheetByName(CFG.ABA_INV);
  if (!sh) return { ok: false, erro: 'Aba Inventário não encontrada' };

  var dados    = sh.getDataRange().getValues();
  var corrigidos = 0;

  for (var i = 1; i < dados.length; i++) {
    // ID fica na coluna extra — ou identificamos pelo código+timestamp
    // Como o ID não é gravado na planilha, buscamos pelos últimos N registros
    // que batem com os codes dos scans
  }

  // Abordagem alternativa: corrige as últimas N linhas que estão na sala errada
  var linhasAlvo = [];
  for (var i = dados.length - 1; i >= 1; i--) {
    if (linhasAlvo.length >= ids.length) break;
    linhasAlvo.push(i + 1); // 1-indexed row
  }

  linhasAlvo.forEach(function(row) {
    sh.getRange(row, 3).setValue(novaSala);
    corrigidos++;
  });

  // Também corrige na aba Patrimônios SUAP os que foram marcados com sala errada
  var shPat = ss.getSheetByName(CFG.ABA_PAT);
  if (shPat) {
    var patDados = shPat.getDataRange().getValues();
    // Busca pelas últimas entradas que têm local diferente da sala original
    for (var i = 1; i < patDados.length; i++) {
      var status = String(patDados[i][4] || '');
      var local  = String(patDados[i][5] || '');
      if (status.indexOf('outro local') > -1 && local !== novaSala) {
        // Verifica se a sala original bate com novaSala
        var salaOriginal = String(patDados[i][2] || '');
        if (salaOriginal === novaSala) {
          shPat.getRange(i+1,5).setValue('✅ Encontrado').setBackground('#0f2d1f').setFontColor('#22c55e');
          shPat.getRange(i+1,6).setValue(novaSala);
        }
      }
    }
  }

  return { ok: true, corrigidos: corrigidos };
}

// ── Busca de patrimônio por número (parcial) ─────────────────
function buscarPatrimonio(code) {
  if (!code || code.length < 3) return { ok: true, resultados: [] };

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var shPat = ss.getSheetByName(CFG.ABA_PAT);
  var shInv = ss.getSheetByName(CFG.ABA_INV);
  if (!shPat) return { ok: false, erro: 'Aba Patrimônios não encontrada' };

  var numStr     = String(code).replace(/^0+/, '').trim();
  var patData    = shPat.getDataRange().getValues();
  var resultados = [];

  for (var i = 1; i < patData.length; i++) {
    var pat = String(patData[i][0] || '').replace(/^0+/, '').replace(/\.0$/, '').trim();
    if (pat.indexOf(numStr) === -1) continue;

    var rawStatus = patData[i][4];
    var status    = (rawStatus instanceof Date) ? '' : String(rawStatus || '').trim();
    var local     = String(patData[i][5] || '').trim();
    var quem      = String(patData[i][6] || '').trim();

    resultados.push({
      numero:    pat,
      descricao: String(patData[i][1] || '').substring(0, 100),
      sala:      status ? local || String(patData[i][2] || '') : String(patData[i][2] || ''),
      status:    status || '⏳ Pendente',
      quem:      quem.split(' · ')[1] || '',
      data:      quem.split(' · ')[0] || ''
    });

    if (resultados.length >= 10) break; // máx 10 resultados
  }

  return { ok: true, resultados: resultados };
}

function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}