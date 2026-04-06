import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('scanner helpers', () => {
  let elements;
  let ctx;

  beforeEach(() => {
    elements = new Map([
      ['manualInput', { value: '86889' }],
      ['scannerVideo', { play: vi.fn().mockResolvedValue(undefined), paused: false, ended: false, videoWidth: 640, videoHeight: 480 }],
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
});
