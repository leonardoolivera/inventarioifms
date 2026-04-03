var _resetToken = null;

function iniciarApp() {
  var roomSet = {};
  state.rooms.forEach(function(r) { roomSet[r] = 1; });
  state.hiddenRooms = state.hiddenRooms.filter(function(r) { return roomSet[r]; });
  state.pinnedRooms = state.pinnedRooms.filter(function(r) { return roomSet[r]; });

  if (state.hiddenRooms.length >= state.rooms.length) {
    state.hiddenRooms = [];
    state.pinnedRooms = [];
  }

  localStorage.setItem('hiddenRooms', JSON.stringify(state.hiddenRooms));
  localStorage.setItem('pinnedRooms', JSON.stringify(state.pinnedRooms));

  if (localStorage.getItem('roomsVersion') !== ROOMS_VERSION) {
    var novaLista = getSalasSUAP();
    state.rooms = novaLista;
    state.hiddenRooms = [];
    state.pinnedRooms = [];
    localStorage.setItem('rooms', JSON.stringify(novaLista));
    localStorage.setItem('hiddenRooms', '[]');
    localStorage.setItem('pinnedRooms', '[]');
    localStorage.setItem('roomsVersion', ROOMS_VERSION);
    console.log('Salas atualizadas para ' + ROOMS_VERSION);
  }

  var saved = localStorage.getItem('currentUser');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      aplicarUsuario(currentUser);
      return;
    } catch (e) {}
  }

  document.getElementById('loginWrap').style.display = 'flex';
}

function fazerLogin() {
  var siape = document.getElementById('siapeInput').value.trim();
  if (!siape || siape.length < 4) {
    document.getElementById('loginError').textContent = 'Digite um SIAPE válido';
    return;
  }

  var btn = document.getElementById('loginBtn');
  btn.innerHTML = '<span class="login-spinner"></span>Verificando...';
  btn.disabled = true;
  document.getElementById('loginError').textContent = '';

  loginSiape(siape)
    .then(function(res) {
      if (res.ok && res.nome) {
        var user = { siape: siape, nome: res.nome, admin: !!res.admin };
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        document.getElementById('loginWrap').style.display = 'none';
        aplicarUsuario(user);
        if (res.scans && res.scans.length) {
          carregarHistoricoServidor(res.scans);
        }
        showToast('ok', 'Olá, ' + res.nome.split(' ')[0] + '!', 'SIAPE ' + siape);
      } else {
        document.getElementById('loginError').textContent =
          (res.erro || 'SIAPE não encontrado') + ' [raw: ' + JSON.stringify(res).substring(0, 80) + ']';
      }
    })
    .catch(function(e) {
      document.getElementById('loginError').textContent = 'Erro de conexão: ' + e.toString();
    })
    .finally(function() {
      btn.innerHTML = 'Entrar';
      btn.disabled = false;
    });
}

function mostrarLoginAdmin() {
  document.getElementById('loginCardSiape').style.display = 'none';
  document.getElementById('loginCardAdmin').style.display = '';
  document.getElementById('adminEmailInput').focus();
}

function mostrarLoginSiape() {
  document.getElementById('loginCardAdmin').style.display = 'none';
  document.getElementById('loginCardSiape').style.display = '';
  document.getElementById('siapeInput').focus();
}

function fazerLoginAdmin() {
  var email = (document.getElementById('adminEmailInput').value || '').trim();
  var senha = document.getElementById('adminSenhaInput').value || '';
  var errEl = document.getElementById('loginErrorAdmin');
  var btn = document.getElementById('loginBtnAdmin');
  errEl.textContent = '';

  if (!email || !senha) {
    errEl.textContent = 'Preencha email e senha';
    return;
  }

  btn.innerHTML = '<span class="login-spinner"></span>Verificando...';
  btn.disabled = true;

  loginEmail(email, senha)
    .then(function(res) {
      if (!res.ok) {
        errEl.textContent = res.erro || 'Email ou senha incorretos';
        return;
      }

      var user = { siape: res.siape, nome: res.nome, admin: true };
      currentUser = user;
      localStorage.setItem('currentUser', JSON.stringify(user));
      document.getElementById('loginWrap').style.display = 'none';
      aplicarUsuario(user);
      showToast('ok', 'Olá, ' + res.nome.split(' ')[0] + '!', 'Admin');
    })
    .catch(function(e) {
      errEl.textContent = 'Erro de conexão: ' + e;
    })
    .finally(function() {
      btn.innerHTML = 'Entrar';
      btn.disabled = false;
    });
}

function abrirRecuperarSenha() {
  var email = (document.getElementById('adminEmailInput').value || '').trim();
  var input = prompt('Email para receber o link de recuperação:', email);
  if (!input || !input.trim()) return;

  recuperarSenha(input.trim())
    .then(function(res) {
      if (res.ok) showToast('ok', 'Email enviado!', 'Verifique sua caixa de entrada');
      else showToast('erro', 'Erro ao enviar', res.erro || '');
    });
}

function verificarResetSenha() {
  var hash = window.location.hash;
  if (!hash) return;

  var params = {};
  hash.slice(1).split('&').forEach(function(p) {
    var kv = p.split('=');
    params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
  });

  if (params.type === 'recovery' && params.access_token) {
    _resetToken = params.access_token;
    history.replaceState(null, '', window.location.pathname);
    var modal = document.getElementById('resetSenhaModal');
    modal.style.display = 'flex';
    document.getElementById('novaSenhaInput').focus();
  }
}

function salvarNovaSenha() {
  var nova = document.getElementById('novaSenhaInput').value || '';
  var confirma = document.getElementById('confirmarSenhaInput').value || '';
  var errEl = document.getElementById('novaSenhaErro');
  var btn = document.getElementById('btnSalvarSenha');
  errEl.textContent = '';

  if (nova.length < 6) {
    errEl.textContent = 'Senha deve ter pelo menos 6 caracteres';
    return;
  }

  if (nova !== confirma) {
    errEl.textContent = 'As senhas não coincidem';
    return;
  }

  if (!_resetToken) {
    errEl.textContent = 'Token inválido, solicite novo link';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Salvando...';

  trocarSenha(nova, _resetToken)
    .then(function(res) {
      if (!res.ok) {
        errEl.textContent = res.erro || 'Erro ao salvar';
        return;
      }

      document.getElementById('resetSenhaModal').style.display = 'none';
      _resetToken = null;
      showToast('ok', 'Senha alterada!', 'Use a nova senha para entrar');
      mostrarLoginAdmin();
      document.getElementById('loginWrap').style.display = 'flex';
    })
    .catch(function(e) {
      errEl.textContent = 'Erro: ' + e;
    })
    .finally(function() {
      btn.disabled = false;
      btn.textContent = 'Salvar senha';
    });
}

function aplicarUsuario(user) {
  var initials = user.nome.split(' ').slice(0, 2).map(function(n) { return n[0]; }).join('');
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('userName').textContent = user.nome;
  document.getElementById('userSiapeLabel').textContent = 'SIAPE: ' + user.siape;
  document.getElementById('userBadge').style.display = 'flex';

  var adminBtn = document.getElementById('adminBtn');
  if (adminBtn) adminBtn.style.display = user.admin ? 'block' : 'none';

  var settingsAdminSection = document.getElementById('settingsAdminSection');
  if (settingsAdminSection) settingsAdminSection.style.display = user.admin ? 'block' : 'none';

  var adminSub = document.getElementById('adminSub');
  if (adminSub) adminSub.textContent = user.nome;

  updateSyncBanner();
}

function fazerLogout() {
  var pendentes = state.pendingSync.length;
  var msg = 'Deseja trocar de conta?\n\n';
  if (pendentes > 0) {
    msg += '⚠️ Você tem ' + pendentes + ' item(s) ainda não sincronizados.\nSincronize antes de sair para não perder dados.\n\n';
  } else {
    msg += '✅ Todos os dados estão salvos na planilha.\n\n';
  }
  msg += 'Seus dados locais serão apagados deste celular.';

  if (!confirm(msg)) return;

  localStorage.removeItem('currentUser');
  currentUser = null;
  document.getElementById('userBadge').style.display = 'none';

  var adminBtn = document.getElementById('adminBtn');
  if (adminBtn) adminBtn.style.display = 'none';

  var settingsAdminSection = document.getElementById('settingsAdminSection');
  if (settingsAdminSection) settingsAdminSection.style.display = 'none';

  document.getElementById('siapeInput').value = '';
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginWrap').style.display = 'flex';
  setTimeout(function() {
    document.getElementById('siapeInput').focus();
  }, 300);
}

function carregarHistoricoServidor(scans) {
  var ids = state.scans.map(function(s) { return s.id; });
  var novos = scans.filter(function(s) { return ids.indexOf(s.id) === -1; });
  if (!novos.length) return;

  state.scans = state.scans.concat(novos);
  saveScans();
  updateStats();
  renderHistList();
}
