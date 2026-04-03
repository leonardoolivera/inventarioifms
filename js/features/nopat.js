window.noPatRoom_selected = window.noPatRoom_selected || null;

function openNoPatModal() {
  abrirCamera();
  noPatPhoto = null;
  noPatEstado = 'Excelente';
  document.getElementById('noPatDesc').value = '';
  noPatRoom_selected = null;
  var roomEl = document.getElementById('noPatRoom');
  roomEl.innerHTML = esc(state.currentRoom || '(sem local)') + ' <span style="font-size:10px;opacity:.6">▼</span>';
  document.getElementById('miniRoomPicker').style.display = 'none';

  var pa = document.getElementById('photoArea');
  var img = pa.querySelector('img');
  if (img) img.remove();
  pa.querySelector('.photo-placeholder').style.display = '';

  document.querySelectorAll('.estado-chip').forEach(function(c) { c.classList.remove('selected'); });
  document.querySelector('.estado-chip.excelente').classList.add('selected');
  document.getElementById('noPatModal').classList.add('show');
}

function closeNoPatModal() {
  document.getElementById('noPatModal').classList.remove('show');
}

function resizeImage(base64, maxW, maxH, quality) {
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() {
      var w = img.width;
      var h = img.height;
      if (w > maxW) {
        h = Math.round(h * maxW / w);
        w = maxW;
      }
      if (h > maxH) {
        w = Math.round(w * maxH / h);
        h = maxH;
      }
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality || 0.75));
    };
    img.onerror = function() { resolve(base64); };
    img.src = base64;
  });
}

function abrirCamera() {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.setAttribute('capture', 'environment');
  inp.style.display = 'none';
  document.body.appendChild(inp);
  inp.addEventListener('change', function(e) {
    var file = e.target.files[0];
    document.body.removeChild(inp);
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      var fullPhoto = ev.target.result;
      var pa = document.getElementById('photoArea');
      pa.querySelector('.photo-placeholder').style.display = 'none';
      var previewImg = pa.querySelector('img') || document.createElement('img');
      previewImg.src = fullPhoto;
      previewImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:8px';
      if (!pa.querySelector('img')) pa.appendChild(previewImg);
      resizeImage(fullPhoto, 400, 400, 0.75).then(function(resized) {
        noPatPhoto = resized;
        sugerirDescricao(true);
        var btn = document.getElementById('suggestBtn');
        if (btn) {
          btn.style.display = 'inline-flex';
          btn.innerHTML = '🔄 Refazer';
        }
      });
    };
    reader.readAsDataURL(file);
  });
  setTimeout(function() { inp.click(); }, 50);
}

function handlePhoto() {}

function selectEstado(val, btn) {
  noPatEstado = val;
  document.querySelectorAll('.estado-chip').forEach(function(c) { c.classList.remove('selected'); });
  btn.classList.add('selected');
}

function toggleRoomPicker() {
  var picker = document.getElementById('miniRoomPicker');
  if (picker.style.display === 'none') {
    picker.innerHTML = state.rooms.map(function(r) {
      var sel = r === (noPatRoom_selected || state.currentRoom);
      var div = document.createElement('div');
      div.className = 'mini-room-item' + (sel ? ' selected' : '');
      div.textContent = (sel ? '✓ ' : '') + r;
      div.setAttribute('onclick', 'selectNoPatRoom(' + JSON.stringify(r) + ')');
      return div.outerHTML;
    }).join('');
    picker.style.display = 'block';
  } else {
    picker.style.display = 'none';
  }
}

function selectNoPatRoom(name) {
  noPatRoom_selected = name;
  var el = document.getElementById('noPatRoom');
  el.innerHTML = esc(name) + ' <span style="font-size:10px;opacity:.6">▼</span>';
  document.getElementById('miniRoomPicker').style.display = 'none';
}

function saveNoPat() {
  var desc = document.getElementById('noPatDesc').value.trim();
  if (!desc) {
    document.getElementById('noPatDesc').focus();
    return;
  }

  var entryId = uid();
  if (noPatPhoto) {
    photoCache[entryId] = noPatPhoto;
    idbSalvarFoto(entryId, noPatPhoto);
  }

  if (!currentUser) {
    var saved = localStorage.getItem('currentUser');
    if (saved) {
      try { currentUser = JSON.parse(saved); } catch (e) {}
    }
  }

  var entry = {
    id: entryId,
    type: 'nopat',
    room: noPatRoom_selected || state.currentRoom || '(sem local)',
    funcionario: currentUser ? currentUser.nome : '',
    siape: currentUser ? currentUser.siape : '',
    desc: desc,
    estado: noPatEstado,
    photo: noPatPhoto || '',
    ts: new Date().toISOString(),
    synced: false
  };

  state.scans.push(entry);
  saveScans();
  addToPendingSync(entry);
  updateStats();
  renderHistList();
  document.getElementById('noPatModal').classList.remove('show');
  showToast('ok', '📸 Item registrado', 'Estado: ' + noPatEstado + ' · ' + entry.room);
  navigator.vibrate && navigator.vibrate([60, 30, 60]);
}
