var GEMINI_KEY_DEFAULT = ''; // chave gerenciada pelo Apps Script

var DB_NAME = 'inventarioCampus';
var DB_VERSION = 1;
var DB_STORE = 'fotos';
var idb = null;

function abrirIDB() {
  return new Promise(function(resolve, reject) {
    if (idb) {
      resolve(idb);
      return;
    }

    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      e.target.result.createObjectStore(DB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = function(e) {
      idb = e.target.result;
      resolve(idb);
    };
    req.onerror = function(e) {
      reject(e.target.error);
    };
  });
}

function idbSalvarFoto(id, base64) {
  return abrirIDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(DB_STORE, 'readwrite');
      var req = tx.objectStore(DB_STORE).put({ id: id, foto: base64, ts: Date.now() });
      req.onsuccess = resolve;
      req.onerror = reject;
    });
  });
}

function idbCarregarFoto(id) {
  return abrirIDB().then(function(db) {
    return new Promise(function(resolve) {
      var req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(id);
      req.onsuccess = function(e) {
        resolve(e.target.result ? e.target.result.foto : null);
      };
      req.onerror = function() {
        resolve(null);
      };
    });
  });
}

function idbDeletarFoto(id) {
  return abrirIDB().then(function(db) {
    return new Promise(function(resolve) {
      db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).delete(id);
      resolve();
    });
  });
}

function idbCarregarTodas() {
  return abrirIDB().then(function(db) {
    return new Promise(function(resolve) {
      var req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).getAll();
      req.onsuccess = function(e) {
        resolve(e.target.result || []);
      };
      req.onerror = function() {
        resolve([]);
      };
    });
  });
}

function getGeminiKey() {
  return localStorage.getItem('geminiKey') || GEMINI_KEY_DEFAULT;
}

function saveGeminiKey() {
  var key = document.getElementById('geminiKeyInput').value.trim();
  if (!key) return;
  localStorage.setItem('geminiKey', key);
  showToast('ok', '✅ Chave Gemini salva!', 'Botão ✨ Sugerir disponível após tirar foto');
}

function testarIA() {
  var btn = document.getElementById('testIABtn');
  btn.textContent = '⏳ Testando...';
  btn.disabled = true;

  var b64Teste = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  descreverFoto('image/png', b64Teste)
    .then(function(res) {
      if (res.ok || res.descricao) {
        showToast('ok', '✅ IA funcionando!', res.descricao || 'ok');
      } else {
        var detalhe = (res.erro || 'Falhou').substring(0, 120);
        showToast('warn', '❌ IA falhou', detalhe);
        console.warn('[testarIA] erro completo:', res.erro);
      }
    })
    .catch(function(e) {
      showToast('warn', 'Erro de conexão', e.toString());
    })
    .finally(function() {
      btn.textContent = '🧪 Testar IA';
      btn.disabled = false;
    });
}

function loadGeminiKey() {
  var inp = document.getElementById('geminiKeyInput');
  if (inp) inp.value = localStorage.getItem('geminiKey') || '';
  if (inp && !inp.value) inp.placeholder = 'Usando chave padrão (AIza...)';
}

function sugerirDescricao(auto) {
  if (!noPatPhoto) {
    if (!auto) showToast('warn', 'Tire uma foto primeiro', '');
    return;
  }

  var btn = document.getElementById('suggestBtn');
  btn.innerHTML = '<span class="spin"></span><span class="suggest-dots">Analisando</span>';
  btn.disabled = true;
  btn.style.opacity = '.85';

  var campo = document.getElementById('noPatDesc');
  if (!campo.value) campo.placeholder = '✨ Gerando descrição...';

  var b64 = noPatPhoto.split(',')[1];
  var mime = noPatPhoto.split(';')[0].split(':')[1] || 'image/jpeg';

  descreverFoto(mime, b64)
    .then(function(res) {
      if (res.descricao) {
        var input = document.getElementById('noPatDesc');
        input.value = res.descricao;
        input.style.borderColor = 'var(--accent)';
        setTimeout(function() {
          input.style.borderColor = '';
        }, 1500);
        if (!auto) showToast('ok', '✨ Descrição sugerida!', 'Edite se necessário');
      } else {
        showToast('warn', '⚠️ ' + (res.erro || 'IA não reconheceu o item'), 'Descreva manualmente');
      }
    })
    .catch(function() {
      showToast('warn', 'Erro ao contatar servidor', 'Verifique a conexão');
    })
    .finally(function() {
      btn.innerHTML = '🔄 Refazer';
      btn.disabled = false;
      btn.style.opacity = '1';
      document.getElementById('noPatDesc').placeholder = "Ex: Cadeira giratória preta, impressora, monitor 19'...";
    });
}
