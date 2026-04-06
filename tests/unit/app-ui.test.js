import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('app ui helpers', () => {
  let elements;
  let ctx;

  beforeEach(() => {
    localStorage.clear();

    elements = new Map([
      ['toast', { className: '', classList: { remove: vi.fn() } }],
      ['toastIco', { textContent: '' }],
      ['toastTitle', { textContent: '' }],
      ['toastSub', { textContent: '' }],
      ['scannerRoomContext', { style: { display: 'none' } }],
      ['scannerContextText', { innerHTML: '', textContent: '' }],
      ['progTempoEstimado', { style: { display: 'none' }, innerHTML: '' }],
      ['progTotal', { textContent: '' }],
      ['progSalas', { textContent: '' }],
      ['progNopat', { textContent: '' }],
      ['progRoomList', { innerHTML: '' }]
    ]);

    ctx = runLegacyScript('js/features/app-ui.js', {
      undoTimer: null,
      undoProgTimer: null,
      toastTimer: null,
      lastEntry: null,
      UNDO_SECS: 5,
      state: {
        currentRoom: 'ALMOXARIFADO (Bloco A)',
        scans: [
          { id: '1', type: 'scan', room: 'ALMOXARIFADO (Bloco A)', ts: new Date().toISOString(), synced: false },
          { id: '2', type: 'nopat', room: 'ALMOXARIFADO (Bloco A)', ts: new Date().toISOString(), synced: false }
        ],
        pendingSync: ['1', '2'],
        scriptUrl: ''
      },
      navigator: { vibrate: vi.fn() },
      saveScans: vi.fn(),
      updateStats: vi.fn(),
      renderHistList: vi.fn(),
      updateSyncBanner: vi.fn(),
      abreviarSala: (room) => ({ curto: room, bloco: 'Bloco A', emoji: '📍' }),
      esc: (value) => String(value || ''),
      escJ: (value) => String(value || ''),
      histBtn: vi.fn(),
      confirm: vi.fn(() => true),
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        },
        createElement() {
          return { click: vi.fn() };
        }
      }
    });
    ctx.suapTotais = { 'ALMOXARIFADO (Bloco A)': 10 };
  });

  it('renders toast payload and visible class', () => {
    ctx.showToast('ok', 'Tudo certo', 'Sincronizado');

    expect(elements.get('toast').className).toContain('show');
    expect(elements.get('toastIco').textContent).not.toBe('');
    expect(elements.get('toastTitle').textContent).toBe('Tudo certo');
    expect(elements.get('toastSub').textContent).toBe('Sincronizado');
  });

  it('updates scanner context with room progress', () => {
    ctx.atualizarContextoScanner();

    expect(elements.get('scannerRoomContext').style.display).toBe('flex');
    expect(elements.get('scannerContextText').innerHTML).toContain('1');
    expect(elements.get('scannerContextText').innerHTML).toContain('10');
  });

  it('clears local session after confirmation', () => {
    ctx.confirmClear();

    expect(ctx.state.scans).toEqual([]);
    expect(ctx.state.pendingSync).toEqual([]);
    expect(ctx.saveScans).toHaveBeenCalled();
    expect(elements.get('toastTitle').textContent).toBe('Sessão limpa');
    expect(elements.get('toastSub').textContent).toBe('Histórico apagado');
  });
});
