window.AUTH_REQUIRE_PIN = window.AUTH_REQUIRE_PIN === true;
window.AUTH_ALLOW_LEGACY_FALLBACK = window.AUTH_ALLOW_LEGACY_FALLBACK !== false;
window.AUTH_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
window.AUTH_MAX_ATTEMPTS = 6;
window.AUTH_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

window._legacyLoginSiape = window._legacyLoginSiape || window.loginSiape;
window._legacyIniciarApp = window._legacyIniciarApp || window.iniciarApp;
window._legacyAdminSalvarFunc = window._legacyAdminSalvarFunc || window.adminSalvarFunc;
window._legacyAdminFecharAddFunc = window._legacyAdminFecharAddFunc || window.adminFecharAddFunc;

function authThrottleKey(scope) {
  return 'authAttempts:' + scope;
}

function readAuthAttempts(scope) {
  try {
    var data = JSON.parse(localStorage.getItem(authThrottleKey(scope)) || '[]');
    var now = Date.now();
    return data.filter(function(ts) { return now - ts < AUTH_ATTEMPT_WINDOW_MS; });
  } catch (e) {
    return [];
  }
}

function saveAuthAttempts(scope, attempts) {
  localStorage.setItem(authThrottleKey(scope), JSON.stringify(attempts));
}

function registerAuthFailure(scope) {
  var attempts = readAuthAttempts(scope);
  attempts.push(Date.now());
  saveAuthAttempts(scope, attempts);
}

function clearAuthFailures(scope) {
  localStorage.removeItem(authThrottleKey(scope));
}

function canAttemptAuth(scope) {
  var attempts = readAuthAttempts(scope);
  saveAuthAttempts(scope, attempts);
  return attempts.length < AUTH_MAX_ATTEMPTS;
}

function authPinVisible() {
  return !!window.AUTH_REQUIRE_PIN;
}

function updateSecurityLoginUI() {
  var pinLabel = document.getElementById('pinLabel');
  var pinInput = document.getElementById('pinInput');
  var help = document.getElementById('siapeLoginHelp');
  if (pinLabel) pinLabel.style.display = authPinVisible() ? 'block' : 'none';
  if (pinInput) {
    pinInput.style.display = authPinVisible() ? 'block' : 'none';
    pinInput.value = '';
  }
  if (help) {
    help.textContent = authPinVisible()
      ? 'Use seu numero SIAPE e PIN para acessar'
      : 'Use seu numero SIAPE para acessar';
  }
}

function expireStoredSessionIfNeeded() {
  var savedAt = Number(localStorage.getItem('currentUserSavedAt') || '0');
  if (!savedAt) return;
  if (Date.now() - savedAt <= AUTH_SESSION_MAX_AGE_MS) return;
  localStorage.removeItem('currentUser');
  localStorage.removeItem('currentUserSavedAt');
}

function secureLoginSiape(siape, pin) {
  var normalizedSiape = String(siape || '').trim().replace(/^0+/, '');
  var normalizedPin = String(pin || '').trim();
  return fetch(SUPABASE_URL + '/functions/v1/auth-siape', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': 'Bearer ' + SUPABASE_ANON,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ siape: normalizedSiape, pin: normalizedPin })
  }).then(function(r) {
    if (r.status === 404 && !AUTH_REQUIRE_PIN && AUTH_ALLOW_LEGACY_FALLBACK && typeof window._legacyLoginSiape === 'function') {
      return window._legacyLoginSiape(normalizedSiape);
    }
    return r.text().then(function(body) {
      var res = {};
      try { res = body ? JSON.parse(body) : {}; } catch (_) {}
      if (!r.ok) return { ok: false, erro: res.erro || res.error || ('HTTP ' + r.status) };
      return res;
    });
  }).catch(function(err) {
    if (!AUTH_REQUIRE_PIN && AUTH_ALLOW_LEGACY_FALLBACK && typeof window._legacyLoginSiape === 'function') {
      return window._legacyLoginSiape(normalizedSiape).then(function(res) {
        if (res && res.ok) res.weakAuth = true;
        return res;
      });
    }
    return { ok: false, erro: err && err.message ? err.message : String(err) };
  });
}

window.loginSiape = secureLoginSiape;

window.fazerLogin = function() {
  var siape = (document.getElementById('siapeInput').value || '').trim();
  var pin = (document.getElementById('pinInput').value || '').trim();
  var errEl = document.getElementById('loginError');
  var btn = document.getElementById('loginBtn');
  errEl.textContent = '';

  if (!siape || siape.length < 4) {
    errEl.textContent = 'Digite um SIAPE valido';
    return;
  }

  if (authPinVisible() && !/^\d{4,6}$/.test(pin)) {
    errEl.textContent = 'Informe um PIN de 4 a 6 numeros';
    return;
  }

  if (!canAttemptAuth('siape')) {
    errEl.textContent = 'Muitas tentativas. Aguarde alguns minutos.';
    return;
  }

  btn.innerHTML = '<span class="login-spinner"></span>Verificando...';
  btn.disabled = true;

  secureLoginSiape(siape, pin)
    .then(function(res) {
      if (res.ok && res.nome) {
        var user = { siape: String(res.siape || siape), nome: res.nome, admin: !!res.admin };
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('currentUserSavedAt', String(Date.now()));
        clearAuthFailures('siape');
        document.getElementById('loginWrap').style.display = 'none';
        aplicarUsuario(user);
        if (res.scans && res.scans.length) carregarHistoricoServidor(res.scans);
        showToast('ok', 'Ola, ' + res.nome.split(' ')[0] + '!', 'SIAPE ' + user.siape);
        if (res.weakAuth) {
          showToast('warn', 'Login legado ativo', 'Configure a funcao auth-siape e habilite o PIN para reforcar a seguranca');
        }
        return;
      }
      registerAuthFailure('siape');
      errEl.textContent = res.erro || 'Credenciais invalidas';
    })
    .catch(function() {
      registerAuthFailure('siape');
      errEl.textContent = 'Erro ao conectar. Tente novamente.';
    })
    .finally(function() {
      btn.innerHTML = 'Entrar';
      btn.disabled = false;
    });
};

window.iniciarApp = function() {
  expireStoredSessionIfNeeded();
  updateSecurityLoginUI();
  return typeof window._legacyIniciarApp === 'function' ? window._legacyIniciarApp() : undefined;
};

window.adminFecharAddFunc = function() {
  if (typeof window._legacyAdminFecharAddFunc === 'function') {
    window._legacyAdminFecharAddFunc();
  }
  var pinInput = document.getElementById('addFuncPin');
  if (pinInput) pinInput.value = '';
};

window.adminSalvarFunc = function() {
  var nome = (document.getElementById('addFuncNome').value || '').trim();
  var siape = (document.getElementById('addFuncSiape').value || '').trim().replace(/^0+/, '');
  var pin = (document.getElementById('addFuncPin').value || '').trim();
  var isAdm = document.getElementById('addFuncAdmin').checked;

  if (!nome || !siape) {
    showToast('warn', 'Preencha nome e SIAPE', '');
    return;
  }

  if (!/^\d+$/.test(siape)) {
    showToast('warn', 'SIAPE deve conter apenas numeros', '');
    return;
  }

  if (pin && !/^\d{4,6}$/.test(pin)) {
    showToast('warn', 'PIN deve ter de 4 a 6 numeros', '');
    return;
  }

  adminOp('addFuncionario', currentUser.siape, {
    siape: siape,
    nome: nome,
    admin: isAdm,
    pin: pin || null
  })
    .then(function(res) {
      if (!res.ok) {
        showToast('erro', 'Erro ao salvar', res.erro || '');
        return;
      }
      showToast('ok', 'Funcionario salvo!', nome + ' · ' + siape);
      window.adminFecharAddFunc();
      adminCarregarFunc();
    })
    .catch(function(err) {
      showToast('erro', 'Erro', String(err));
    });
};

window.alterarMeuPin = function() {
  var atual = (document.getElementById('currentPinInput').value || '').trim();
  var novo = (document.getElementById('newPinInput').value || '').trim();
  var confirma = (document.getElementById('confirmNewPinInput').value || '').trim();
  var btn = document.getElementById('changePinBtn');
  var statusEl = document.getElementById('changePinStatus');

  if (!currentUser || !currentUser.siape) {
    if (statusEl) statusEl.textContent = 'Faca login novamente para alterar o PIN.';
    return;
  }

  if (!/^\d{4,6}$/.test(atual)) {
    if (statusEl) statusEl.textContent = 'Informe o PIN atual com 4 a 6 numeros.';
    return;
  }

  if (!/^\d{4,6}$/.test(novo)) {
    if (statusEl) statusEl.textContent = 'O novo PIN deve ter 4 a 6 numeros.';
    return;
  }

  if (novo !== confirma) {
    if (statusEl) statusEl.textContent = 'A confirmacao do novo PIN nao confere.';
    return;
  }

  if (novo === atual) {
    if (statusEl) statusEl.textContent = 'Escolha um PIN diferente do atual.';
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Alterando...';
  }
  if (statusEl) statusEl.textContent = 'Validando seu PIN atual...';

  fetch(SUPABASE_URL + '/functions/v1/change-pin', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': 'Bearer ' + SUPABASE_ANON,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      siape: currentUser.siape,
      currentPin: atual,
      newPin: novo
    })
  })
    .then(function(r) {
      return r.text().then(function(body) {
        var res = {};
        try { res = body ? JSON.parse(body) : {}; } catch (_) {}
        if (!r.ok) return { ok: false, erro: res.erro || res.error || ('HTTP ' + r.status) };
        return res;
      });
    })
    .then(function(res) {
      if (!res.ok) {
        if (statusEl) statusEl.textContent = res.erro || 'Nao foi possivel alterar o PIN.';
        return;
      }
      document.getElementById('currentPinInput').value = '';
      document.getElementById('newPinInput').value = '';
      document.getElementById('confirmNewPinInput').value = '';
      if (statusEl) statusEl.textContent = 'PIN alterado com sucesso.';
      showToast('ok', 'PIN atualizado', 'Seu acesso foi protegido com o novo PIN');
    })
    .catch(function(err) {
      if (statusEl) statusEl.textContent = 'Erro ao alterar PIN: ' + String(err);
    })
    .finally(function() {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Alterar meu PIN';
      }
    });
};

updateSecurityLoginUI();
