var undoTimer = null;
var wrongRoomStreak = 0;
var wrongRoomLastIds = [];
var undoProgTimer = null;
var lastEntry = null;
var UNDO_SECS = 5;

function normCod(c) {
  return String(c).replace(/^0+/, '') || '0';
}

function processScan(rawCode) {
  var code = normCod(rawCode);

  var dupLocal = state.scans.find(function(s) {
    return s.type === 'scan' && normCod(s.code) === code;
  });
  if (dupLocal) {
    flashScan('warn');
    showToast('dup', '⚠️ Já escaneado por você', '' + dupLocal.room + ' · ' + fmtTime(new Date(dupLocal.ts)));
    return;
  }

  commitScan(code);

  if (state.isOnline) {
    checkDuplicate(code)
      .then(function(res) {
        if (res.duplicado) {
          flashScan('warn');
          showToast('dup', '⚠️ Patrimônio já encontrado!', 'Escaneado por ' + res.quem + ' em ' + res.local);
        }
      })
      .catch(function() {});
  }
}

function commitScan(code) {
  var room = state.currentRoom || '(sem local)';

  if (!currentUser) {
    var saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        currentUser = JSON.parse(saved);
      } catch (e) {}
    }
  }

  var entry = {
    id: uid(),
    type: 'scan',
    code: code,
    room: room,
    funcionario: currentUser ? currentUser.nome : '',
    siape: currentUser ? currentUser.siape : '',
    ts: new Date().toISOString(),
    synced: false
  };

  state.scans.push(entry);
  lastEntry = entry;
  saveScans();
  addToPendingSync(entry);
  updateStats();
  renderHistList();
  atualizarContextoScanner();
  flashScan('ok');
  if (navigator.vibrate) navigator.vibrate(60);
  showUndoBar(code, room);

  if (state.isOnline) {
    lookupPatrimonio(code)
      .then(function(res) {
        if (!(res.ok && res.descricao)) return;

        var sub = document.getElementById('undoSub');
        if (sub) {
          var localCorreto = !res.salaOriginal || res.salaOriginal === room;
          var icone = localCorreto ? '✅' : '🟡';
          sub.textContent = icone + ' ' + res.descricao
            + (!localCorreto ? ' · original: ' + res.salaOriginal : '');
        }

        if (res.salaOriginal) {
          var localCorreto2 = res.salaOriginal === room;
          if (!localCorreto2) {
            wrongRoomStreak++;
            wrongRoomLastIds.push(entry.id);
            if (wrongRoomLastIds.length > 3) wrongRoomLastIds.shift();
            if (wrongRoomStreak >= 3) {
              wrongRoomStreak = 0;
              var idsParaCorrigir = wrongRoomLastIds.slice();
              setTimeout(function() {
                mostrarAvisoSala(res.salaOriginal, idsParaCorrigir);
              }, 800);
            }
          } else {
            wrongRoomStreak = 0;
            wrongRoomLastIds = [];
          }
        }
      })
      .catch(function() {});
  }
}
