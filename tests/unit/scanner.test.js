import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('scanner helpers', () => {
  let elements;
  let ctx;
  let stream;

  beforeEach(() => {
    stream = {
      getTracks: () => [{ stop: vi.fn() }]
    };
    elements = new Map([
      ['manualInput', { value: '86889' }],
      ['scannerVideo', { play: vi.fn().mockResolvedValue(undefined), paused: false, ended: false, videoWidth: 640, videoHeight: 480, set srcObject(value) { this._srcObject = value; }, get srcObject() { return this._srcObject; } }],
      ['iosOverlay', { style: { display: '' } }],
      ['toast', { className: '', classList: { remove: vi.fn() } }],
      ['toastIco', { textContent: '' }],
      ['toastTitle', { textContent: '' }],
      ['toastSub', { textContent: '' }]
    ]);

    ctx = runLegacyScript('js/features/scanner.js', {
      state: { currentRoom: '', rooms: [] },
      showScreen: vi.fn(),
      goBack: vi.fn(),
      processScan: vi.fn(),
      carregarTotaisSUAP: vi.fn((cb) => cb && cb()),
      atualizarContextoScanner: vi.fn(),
      showToast: vi.fn(),
      navigator: {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(Object.assign(new Error('not found'), { name: 'NotFoundError' }))
        }
      },
      requestAnimationFrame: (cb) => cb(),
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        },
        addEventListener() {},
        createElement() {
          return { getContext: () => ({ drawImage: vi.fn() }) };
        }
      }
    });
  });

  it('redirects to room selection when no current room is set', () => {
    ctx.startScanner();

    expect(ctx._selecionandoParaScan).toBe(true);
    expect(ctx.showScreen).toHaveBeenCalledWith('scRooms');
  });

  it('processes manual input and clears the field', () => {
    ctx.processManual();

    expect(elements.get('manualInput').value).toBe('');
    expect(ctx.processScan).toHaveBeenCalledWith('86889');
  });

  it('shows camera not found warning when capture fails', async () => {
    ctx.startCamera();
    await Promise.resolve();
    await Promise.resolve();

    expect(ctx.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
  });

  it('opens scanner with active room and binds camera stream', async () => {
    ctx.state.currentRoom = 'ALMOXARIFADO (Bloco A)';
    ctx.navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(stream);

    ctx.startScanner();
    await Promise.resolve();
    await Promise.resolve();

    expect(ctx.showScreen).toHaveBeenCalledWith('scScanner');
    expect(elements.get('scannerVideo').srcObject).toBe(stream);
    expect(ctx.atualizarContextoScanner).toHaveBeenCalled();
  });
});
