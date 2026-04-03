function adminTab(tab) {
  var tabMap = { func: 'tabFunc', import: 'tabImport', reset: 'tabReset' };
  var paneMap = { func: 'adminPanelFunc', import: 'adminPanelImport', reset: 'adminPanelReset' };
  ['func', 'import', 'reset'].forEach(function(item) {
    document.getElementById(tabMap[item]).classList.toggle('active', item === tab);
    document.getElementById(paneMap[item]).style.display = item === tab ? '' : 'none';
  });
  if (tab === 'func') adminCarregarFunc();
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

function adminAbrirAddFunc() {
  document.getElementById('addFuncForm').style.display = '';
  document.getElementById('addFuncNome').focus();
}

function adminFecharAddFunc() {
  document.getElementById('addFuncForm').style.display = 'none';
  document.getElementById('addFuncNome').value = '';
  document.getElementById('addFuncSiape').value = '';
  document.getElementById('addFuncAdmin').checked = false;
}

function adminSalvarFunc() {
  var nome = (document.getElementById('addFuncNome').value || '').trim();
  var siape = (document.getElementById('addFuncSiape').value || '').trim().replace(/^0+/, '');
  var isAdm = document.getElementById('addFuncAdmin').checked;

  if (!nome || !siape) {
    showToast('warn', 'Preencha nome e SIAPE', '');
    return;
  }

  if (!/^\d+$/.test(siape)) {
    showToast('warn', 'SIAPE deve conter apenas numeros', '');
    return;
  }

  adminOp('addFuncionario', currentUser.siape, { siape: siape, nome: nome, admin: isAdm })
    .then(function(res) {
      if (!res.ok) {
        showToast('erro', 'Erro ao salvar: ' + (res.erro || ''), '');
        return;
      }
      showToast('ok', 'Funcionario salvo!', nome + ' · ' + siape);
      adminFecharAddFunc();
      adminCarregarFunc();
    })
    .catch(function(err) {
      showToast('erro', 'Erro: ' + err, '');
    });
}

function adminRemoverFunc(siape, nome) {
  if (!confirm('Remover "' + nome + '" (SIAPE ' + siape + ')?\n\nEle(a) nao conseguira mais fazer login.')) return;

  adminOp('removeFuncionario', currentUser.siape, { siape: siape })
    .then(function(res) {
      if (!res.ok) {
        showToast('erro', 'Erro: ' + (res.erro || ''), '');
        return;
      }
      showToast('ok', 'Funcionario removido', nome);
      adminCarregarFunc();
    })
    .catch(function(err) {
      showToast('erro', 'Erro: ' + err, '');
    });
}

window._adminPlanilhaRows = window._adminPlanilhaRows || [];
window._adminPlanilhaCols = window._adminPlanilhaCols || [];

function adminLerPlanilha(input) {
  var file = input.files && input.files[0];
  if (!file) return;

  document.getElementById('importStatus').textContent = 'Lendo arquivo...';
  var reader = new FileReader();
  reader.onload = function(event) {
    try {
      var wb = XLSX.read(event.target.result, { type: 'array' });
      var ws = wb.Sheets[wb.SheetNames[0]];
      var data = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!data.length) {
        document.getElementById('importStatus').textContent = 'Planilha vazia ou sem linhas.';
        return;
      }

      _adminPlanilhaRows = data;
      _adminPlanilhaCols = Object.keys(data[0]);
      adminPopularMapeamentos();
      adminMostrarPreview();
      document.getElementById('importStatus').textContent =
        data.length + ' linha(s) encontrada(s). Confira os mapeamentos abaixo e clique em Importar.';
      document.getElementById('importPreview').style.display = '';
    } catch (err) {
      document.getElementById('importStatus').textContent = 'Erro ao ler arquivo: ' + err;
    }
  };
  reader.readAsArrayBuffer(file);
}

function _adivinharColuna(cols, hints) {
  var lower = cols.map(function(col) { return col.toLowerCase(); });
  for (var i = 0; i < hints.length; i++) {
    for (var j = 0; j < lower.length; j++) {
      if (lower[j].indexOf(hints[i]) > -1) return cols[j];
    }
  }
  return '';
}

function adminPopularMapeamentos() {
  var cols = ['(ignorar)'].concat(_adminPlanilhaCols);
  ['mapNumero', 'mapDescricao', 'mapSala', 'mapEstado'].forEach(function(id) {
    var sel = document.getElementById(id);
    sel.innerHTML = cols.map(function(col) {
      return '<option value="' + escHtml(col) + '">' + escHtml(col) + '</option>';
    }).join('');
  });

  var num = _adivinharColuna(_adminPlanilhaCols, ['numero', 'number', 'patrimonio', 'tombamento', 'codigo']);
  var desc = _adivinharColuna(_adminPlanilhaCols, ['descricao', 'description', 'nome', 'item', 'bem']);
  var sala = _adivinharColuna(_adminPlanilhaCols, ['sala', 'local', 'localizacao', 'location', 'ambiente']);
  var estado = _adivinharColuna(_adminPlanilhaCols, ['estado', 'estado_suap', 'conservacao', 'condicao', 'estado_conservacao']);

  if (num) document.getElementById('mapNumero').value = num;
  if (desc) document.getElementById('mapDescricao').value = desc;
  if (sala) document.getElementById('mapSala').value = sala;
  if (estado) document.getElementById('mapEstado').value = estado;
}

function adminMostrarPreview() {
  var tbl = document.getElementById('importTable');
  var infoEl = document.getElementById('importInfo');
  var sample = _adminPlanilhaRows.slice(0, 5);
  if (!sample.length) {
    if (tbl) tbl.innerHTML = '';
    return;
  }

  var cols = _adminPlanilhaCols;
  if (infoEl) infoEl.textContent = 'Primeiras 5 de ' + _adminPlanilhaRows.length + ' linha(s):';
  if (!tbl) return;

  tbl.innerHTML = '<thead><tr>'
    + cols.map(function(col) {
      return '<th style="border:1px solid #ddd;padding:4px;background:#f3f4f6;font-size:11px">' + escHtml(col) + '</th>';
    }).join('')
    + '</tr></thead><tbody>'
    + sample.map(function(row) {
      return '<tr>' + cols.map(function(col) {
        return '<td style="border:1px solid #ddd;padding:4px;font-size:11px">' + escHtml(String(row[col] || '')) + '</td>';
      }).join('') + '</tr>';
    }).join('')
    + '</tbody>';
}

function adminImportar() {
  var colNum = document.getElementById('mapNumero').value;
  var colDesc = document.getElementById('mapDescricao').value;
  var colSala = document.getElementById('mapSala').value;
  var colEst = document.getElementById('mapEstado').value;

  if (!colNum || colNum === '(ignorar)') {
    showToast('warn', 'Selecione a coluna de Numero', '');
    return;
  }

  var rows = _adminPlanilhaRows.map(function(row) {
    return {
      numero: String(row[colNum] || '').trim().replace(/\.0$/, ''),
      descricao: colDesc !== '(ignorar)' ? String(row[colDesc] || '').trim() : '',
      sala_suap: colSala !== '(ignorar)' ? String(row[colSala] || '').trim() : '',
      estado_suap: colEst !== '(ignorar)' ? String(row[colEst] || '').trim() : ''
    };
  }).filter(function(row) {
    return row.numero;
  });

  if (!rows.length) {
    showToast('warn', 'Nenhuma linha com numero valido encontrada', '');
    return;
  }

  var btn = document.getElementById('importBtn');
  btn.disabled = true;
  btn.textContent = 'Importando...';
  document.getElementById('importStatus').textContent = 'Enviando ' + rows.length + ' itens...';

  adminOp('importarPatrimonios', currentUser.siape, { rows: rows })
    .then(function(res) {
      if (!res.ok) {
        showToast('erro', 'Erro na importacao', res.erro || '');
        document.getElementById('importStatus').textContent = 'Erro: ' + (res.erro || '');
        return;
      }

      showToast('ok', res.importados + ' patrimonios importados!', '');
      document.getElementById('importStatus').textContent = 'OK ' + res.importados + ' patrimonios importados com sucesso!';
      document.getElementById('importPreview').style.display = 'none';
      document.getElementById('importFileInput').value = '';
      _adminPlanilhaRows = [];
      _adminPlanilhaCols = [];
    })
    .catch(function(err) {
      showToast('erro', 'Erro: ' + err, '');
      document.getElementById('importStatus').textContent = 'Erro: ' + err;
    })
    .finally(function() {
      btn.disabled = false;
      btn.textContent = 'Importar';
    });
}

function adminResetar() {
  var confirmacao = prompt('Esta acao apaga TODOS os scans e resultados de inventario.\n\nDigite CONFIRMAR para prosseguir:');
  if (confirmacao !== 'CONFIRMAR') {
    showToast('warn', 'Resetar cancelado', '');
    return;
  }

  var btn = document.getElementById('btnResetar');
  btn.disabled = true;
  btn.textContent = 'Resetando...';

  adminOp('resetarInventario', currentUser.siape)
    .then(function(res) {
      if (!res.ok) {
        showToast('erro', 'Erro ao resetar: ' + (res.erro || ''), '');
        return;
      }
      showToast('ok', 'Inventario resetado com sucesso!', 'Todos os scans foram apagados');
      document.getElementById('resetStatus').textContent = 'OK Resetado em ' + new Date().toLocaleString('pt-BR');
    })
    .catch(function(err) {
      showToast('erro', 'Erro: ' + err, '');
    })
    .finally(function() {
      btn.disabled = false;
      btn.textContent = 'Resetar Inventario';
    });
}
