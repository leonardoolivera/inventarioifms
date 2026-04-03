window.scannerStream = window.scannerStream || null;
window.quaggaRunning = window.quaggaRunning || false;
window.lastScanned = window.lastScanned || '';
window.lastScannedTime = window.lastScannedTime || 0;
window.html5Scanner = window.html5Scanner || null;
window.zxingReader = window.zxingReader || null;
window.mlkitCanvas = window.mlkitCanvas || document.createElement('canvas');
window.mlkitCtx = window.mlkitCtx || null;
window.mlkitLoop = window.mlkitLoop || null;
window.barcodeDetector = window.barcodeDetector || null;
window.hasBarcodeDetector = ('BarcodeDetector' in window);

function abrirTelaScanner() {
  showScreen('scScanner');
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      startCamera();
      carregarTotaisSUAP(function() { atualizarContextoScanner(); });
    });
  });
}

function startScanner() {
  if (!state.currentRoom) {
    window._selecionandoParaScan = true;
    showScreen('scRooms');
    return;
  }
  abrirTelaScanner();
}

function startCamera() {
  if (quaggaRunning) return;
  var video = document.getElementById('scannerVideo');

  navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
  }).then(function(stream) {
    scannerStream = stream;
    video.srcObject = stream;
    return video.play();
  }).then(function() {
    quaggaRunning = true;
    if (hasBarcodeDetector) {
      barcodeDetector = new BarcodeDetector({
        formats: ['code_128', 'ean_13', 'ean_8', 'code_39', 'upc_a', 'upc_e', 'itf', 'pdf417', 'aztec', 'data_matrix', 'qr_code']
      });
      mlkitCanvas.width = video.videoWidth || 1280;
      mlkitCanvas.height = video.videoHeight || 720;
      mlkitCtx = mlkitCanvas.getContext('2d');
      mlkitLoop = setInterval(function() {
        if (!quaggaRunning || video.paused || video.ended) return;
        mlkitCtx.drawImage(video, 0, 0, mlkitCanvas.width, mlkitCanvas.height);
        barcodeDetector.detect(mlkitCanvas).then(function(barcodes) {
          if (!barcodes.length) return;
          var code = barcodes[0].rawValue;
          var now = Date.now();
          if (code === lastScanned && now - lastScannedTime < 800) return;
          lastScanned = code;
          lastScannedTime = now;
          processScan(code);
        }).catch(function() {});
      }, 150);
    } else {
      try {
        zxingReader = new ZXing.BrowserMultiFormatReader();
        zxingReader.decodeFromVideoElement(video, function(result) {
          if (!result) return;
          var code = result.getText();
          var now = Date.now();
          if (code === lastScanned && now - lastScannedTime < 800) return;
          lastScanned = code;
          lastScannedTime = now;
          processScan(code);
        });
      } catch (e) {
        showToast('warn', 'Scanner indisponível', 'Use entrada manual');
      }
    }
  }).catch(function(e) {
    showToast('warn', 'Câmera negada', 'Permita o acesso à câmera nas configurações');
    console.error(e);
  });
}

function stopScanner() {
  quaggaRunning = false;
  if (mlkitLoop) {
    clearInterval(mlkitLoop);
    mlkitLoop = null;
  }
  if (zxingReader) {
    try { zxingReader.reset(); } catch (e) {}
    zxingReader = null;
  }
  if (scannerStream) {
    scannerStream.getTracks().forEach(function(t) { t.stop(); });
    scannerStream = null;
  }
  var overlay = document.getElementById('iosOverlay');
  if (overlay) overlay.style.display = 'none';
  goBack();
}

function processManual() {
  var input = document.getElementById('manualInput');
  var v = input.value.trim();
  if (!v) return;
  input.value = '';
  processScan(v);
}

if (!window.__scannerManualInputBound) {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var inp = document.getElementById('manualInput');
      if (document.activeElement === inp) processManual();
    }
  });
  window.__scannerManualInputBound = true;
}
