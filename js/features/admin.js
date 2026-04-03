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
