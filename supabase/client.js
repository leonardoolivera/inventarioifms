// ================================================================
//  Supabase Client — substitui todas as chamadas ao Apps Script
//  Cole SUPABASE_URL e SUPABASE_ANON_KEY após criar o projeto
// ================================================================

var SUPABASE_URL  = '';   // ex: https://xyzxyz.supabase.co
var SUPABASE_ANON = '';   // chave pública (anon key) — pode ficar no código

// ── Helper base ───────────────────────────────────────────────
function sbFetch(path, opts) {
  return fetch(SUPABASE_URL + path, Object.assign({
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': 'Bearer ' + SUPABASE_ANON,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  }, opts)).then(function(r) { return r.json(); });
}

// ── LOGIN por SIAPE ───────────────────────────────────────────
// Substitui: doGet?action=login&siape=...
function loginSiape(siape) {
  var s = String(siape).trim().replace(/^0+/, '');
  return sbFetch('/rest/v1/funcionarios?siape=eq.' + encodeURIComponent(s) + '&ativo=eq.true&select=siape,nome')
    .then(function(rows) {
      if (!rows || !rows.length) return { ok: false, erro: 'SIAPE não cadastrado. Fale com o gestor.' };
      return { ok: true, nome: rows[0].nome, siape: rows[0].siape, scans: [] };
    });
}

// ── SYNC em lote ──────────────────────────────────────────────
// Substitui: doPost action=batchSync
function batchSync(items) {
  var scans  = items.filter(function(i){ return i.type === 'scan'; });
  var nopats = items.filter(function(i){ return i.type === 'nopat'; });
  var promises = [];

  // Insere scans
  if (scans.length) {
    var scanRows = scans.map(function(i) {
      return { id: i.id, codigo: i.code, sala: i.room, funcionario: i.funcionario||null, siape: i.siape||null, criado_em: i.ts };
    });
    promises.push(
      sbFetch('/rest/v1/scans', { method: 'POST', body: JSON.stringify(scanRows),
        headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON,
          'Content-Type': 'application/json', 'Prefer': 'resolution=ignore-duplicates' }
      }).then(function() {
        // Marca cada patrimônio como encontrado
        return Promise.all(scans.map(function(i) {
          return marcarEncontrado(i.code, i.room, i.funcionario||'', i.siape||'');
        }));
      })
    );
  }

  // Insere sem_patrimônio (fotos já devem estar no Storage antes)
  if (nopats.length) {
    var nopatRows = nopats.map(function(i) {
      return { id: i.id, sala: i.room, descricao: i.desc, estado: i.estado,
               foto_url: i.foto_url||null, funcionario: i.funcionario||null, siape: i.siape||null, criado_em: i.ts };
    });
    promises.push(
      sbFetch('/rest/v1/sem_patrimonio', { method: 'POST', body: JSON.stringify(nopatRows),
        headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON,
          'Content-Type': 'application/json', 'Prefer': 'resolution=ignore-duplicates' }
      })
    );
  }

  return Promise.all(promises).then(function() { return { ok: true, sincronizados: items.length }; });
}

// ── MARCAR patrimônio como encontrado ─────────────────────────
function marcarEncontrado(numero, sala, funcionario, siape) {
  var numStr = String(numero).replace(/^0+/, '').trim();
  // Busca o patrimônio
  return sbFetch('/rest/v1/patrimonios?numero=eq.' + encodeURIComponent(numStr) + '&select=id,sala_suap,status')
    .then(function(rows) {
      if (!rows || !rows.length) return { encontrado: false };
      var p = rows[0];
      var jaMarcado = p.status && p.status !== '';
      var ts = new Date().toISOString();
      var registro = funcionario + ' (' + siape + ')';
      var novoStatus, novoLocal;

      if (jaMarcado) {
        novoStatus = '🔴 DUPLICADO';
        novoLocal  = p.sala_suap + ' → ' + sala;
      } else if (sala !== p.sala_suap) {
        novoStatus = '🟡 Outro local';
        novoLocal  = sala;
      } else {
        novoStatus = '✅ Encontrado';
        novoLocal  = sala;
      }

      return sbFetch('/rest/v1/patrimonios?id=eq.' + p.id, {
        method: 'PATCH',
        body: JSON.stringify({ status: novoStatus, local_encontrado: novoLocal,
                               encontrado_por: registro, encontrado_em: ts })
      }).then(function() {
        return { encontrado: true, duplicado: jaMarcado, outroLocal: sala !== p.sala_suap };
      });
    });
}

// ── BUSCAR patrimônio (parcial, rápido via índice trigram) ─────
// Substitui: doGet?action=buscarPatrimonio&code=...
function buscarPatrimonio(code) {
  if (!code || code.length < 3) return Promise.resolve({ ok: true, resultados: [] });
  var q = encodeURIComponent(code);
  return sbFetch('/rest/v1/patrimonios?numero=ilike.*' + q + '*&select=numero,descricao,sala_suap,status,local_encontrado,encontrado_por,encontrado_em&limit=10')
    .then(function(rows) {
      return { ok: true, resultados: (rows||[]).map(function(r) {
        return {
          numero:    r.numero,
          descricao: r.descricao || '',
          sala:      r.status ? (r.local_encontrado || r.sala_suap) : r.sala_suap,
          status:    r.status || '⏳ Pendente',
          quem:      r.encontrado_por || '',
          data:      r.encontrado_em ? new Date(r.encontrado_em).toLocaleString('pt-BR') : ''
        };
      })};
    });
}

// ── COMPARAÇÃO por sala ───────────────────────────────────────
// Substitui: doGet?action=comparacaoSala
function getComparacaoSala() {
  return sbFetch('/rest/v1/patrimonios?select=numero,descricao,sala_suap,status,local_encontrado,encontrado_por&limit=10000')
    .then(function(rows) {
      var porSala = {};
      (rows||[]).forEach(function(r) {
        var sala = r.sala_suap || '';
        if (!sala) return;
        var tipo = 'pendente';
        if (r.status === '✅ Encontrado') tipo = 'correto';
        else if (r.status === '🟡 Outro local') tipo = 'outro_local';
        else if (r.status === '❌ Não localizado') tipo = 'nao_localizado';
        else if (r.status === '🔴 DUPLICADO') tipo = 'outro_local';
        if (!porSala[sala]) porSala[sala] = [];
        porSala[sala].push([r.numero, (r.descricao||'').substring(0,80), tipo,
                            r.local_encontrado||'', (r.encontrado_por||'').split(' ')[0]]);
      });
      return { ok: true, porSala: porSala };
    });
}

// ── TOTAL por sala ────────────────────────────────────────────
function getTotalPorSala() {
  return sbFetch('/rest/v1/vw_progresso_por_sala?select=*')
    .then(function(rows) { return { ok: true, salas: rows || [] }; });
}

// ── CHECK duplicado ───────────────────────────────────────────
function checkDuplicate(code) {
  var numStr = String(code).replace(/^0+/, '').trim();
  return sbFetch('/rest/v1/patrimonios?numero=eq.' + encodeURIComponent(numStr) + '&select=status,local_encontrado,encontrado_por')
    .then(function(rows) {
      if (!rows || !rows.length) return { ok: true, duplicado: false };
      var p = rows[0];
      return { ok: true, duplicado: p.status !== '' && p.status != null,
               status: p.status, local: p.local_encontrado, quem: p.encontrado_por };
    });
}

// ── UPLOAD de foto ────────────────────────────────────────────
// Faz upload direto para o Supabase Storage, retorna URL pública
function uploadFoto(itemId, base64data) {
  var dados = base64data;
  var mime  = 'image/jpeg';
  if (base64data.indexOf(',') > -1) {
    var partes = base64data.split(',');
    dados = partes[1];
    if (partes[0].indexOf('png')  > -1) mime = 'image/png';
    if (partes[0].indexOf('webp') > -1) mime = 'image/webp';
  }

  var byteChars = atob(dados);
  var byteArr   = new Uint8Array(byteChars.length);
  for (var i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
  var blob = new Blob([byteArr], { type: mime });
  var ext  = mime.split('/')[1];
  var path = 'fotos/' + itemId + '.' + ext;

  return fetch(SUPABASE_URL + '/storage/v1/object/sem-patrimonio/' + path, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON,
               'Content-Type': mime, 'x-upsert': 'true' },
    body: blob
  }).then(function(r) {
    if (!r.ok) throw new Error('Upload falhou: ' + r.status);
    return SUPABASE_URL + '/storage/v1/object/public/sem-patrimonio/' + path;
  });
}

// ── DESCREVER FOTO via Edge Function ─────────────────────────
function descreverFoto(mime, b64) {
  return fetch(SUPABASE_URL + '/functions/v1/descrever-foto', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON,
               'Content-Type': 'application/json' },
    body: JSON.stringify({ mime: mime, b64: b64 })
  }).then(function(r) { return r.json(); });
}
