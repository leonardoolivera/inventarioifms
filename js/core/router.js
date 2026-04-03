function showScreen(id) {
  var cur = document.querySelector('.screen:not(.hidden):not(.slide-left)');
  if (cur && cur.id !== id) {
    screenHistory.push(cur.id);
    cur.classList.add('slide-left');
  }

  var next = document.getElementById(id);
  if (!next) return;
  next.classList.remove('hidden', 'slide-left');

  if (id === 'scHistory') renderHistList();
  if (id === 'scRooms') renderRoomList();
  if (id === 'scSettings') {
    renderSettRooms();
    loadScriptUrl();
  }
  if (id === 'scMinhasSalas') carregarTotaisSUAP(function() { renderMinhasSalas(); });
  if (id === 'scCampus' && !campusData) carregarCampus();
  if (id === 'scHome') {
    updateStats();
    updateSyncBanner();
  }
  if (id === 'scDashboard') carregarDashboard();
}

function goBack() {
  var prev = screenHistory.pop() || 'scHome';
  var cur = document.querySelector('.screen:not(.hidden):not(.slide-left)');

  if (cur) {
    cur.classList.add('hidden');
    cur.classList.remove('slide-left');
  }

  var prevScreen = document.getElementById(prev);
  if (prevScreen) prevScreen.classList.remove('hidden', 'slide-left');
}
