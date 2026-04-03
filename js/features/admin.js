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
