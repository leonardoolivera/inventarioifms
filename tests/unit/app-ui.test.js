import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('app ui helpers', () => {
  let elements;
  let ctx;
  let timeouts;

  beforeEach(() => {
    localStorage.clear();
    timeouts = [];

    elements = new Map([
      ['toast', { className: '', classList: { remove: vi.fn() } }],
      ['toastIco', { textContent: '' }],
      ['toastTitle', { textContent: '' }],
      ['toastSub', { textContent: '' }],
      ['undoCode', { textContent: '' }],
      ['undoSub', { textContent: '' }],
      ['undoBar', { classList: { add: vi.fn(), remove: vi.fn() } }],
      ['undoProg', { style: { transition: '', width: '' } }],
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
      prompt: vi.fn(() => 'https://script.google.com/macros/s/test/exec'),
      fetch: vi.fn(() => Promise.resolve()),
      URL: { createObjectURL: vi.fn(() => 'blob:test') },
      Blob,
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        },
        createElement() {
          return { click: vi.fn(), href: '', download: '' };
        }
      },
      setTimeout: vi.fn((fn, ms) => {
        timeouts.push({ fn, ms });
        return timeouts.length;
      }),
      clearTimeout: vi.fn(),
      clearInterval: vi.fn()
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

  it('shows undo bar and removes the last entry on undo', () => {
    ctx.lastEntry = { id: '1' };

    ctx.showUndoBar('86889', 'ALMOXARIFADO');
    expect(elements.get('undoCode').textContent).toContain('86889');
    expect(elements.get('undoBar').classList.add).toHaveBeenCalledWith('show');

    ctx.undoLast();
    expect(ctx.state.scans).toHaveLength(1);
    expect(ctx.state.pendingSync).toEqual(['2']);
    expect(ctx.updateSyncBanner).toHaveBeenCalled();
    expect(elements.get('toastTitle').textContent).toContain('Desfeito');
  });

  it('wraps async action feedback around buttons', async () => {
    const button = {
      tagName: 'BUTTON',
      disabled: false,
      innerHTML: 'Salvar',
      dataset: {},
      classList: { toggle: vi.fn() }
    };

    const promise = ctx.withActionFeedback(button, 'Carregando...', () => 'ok');
    timeouts[0].fn();

    await expect(promise).resolves.toBe('ok');
    expect(button.classList.toggle).toHaveBeenCalledWith('busy', true);
    expect(button.classList.toggle).toHaveBeenLastCalledWith('busy', false);
    expect(button.innerHTML).toBe('Salvar');
  });

  it('stores spreadsheet url and exports csv', async () => {
    const button = {
      tagName: 'BUTTON',
      disabled: false,
      innerHTML: 'Configurar',
      dataset: {},
      classList: { toggle: vi.fn() }
    };

    const promise = ctx.configurarPlanilhaUrl(button);
    timeouts[0].fn();
    await promise;

    expect(ctx.state.scriptUrl).toContain('script.google.com');
    expect(localStorage.getItem('scriptUrl')).toContain('script.google.com');

    ctx.exportCSV();
    expect(ctx.URL.createObjectURL).toHaveBeenCalled();
  });
});
