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
      ['progRoomList', { innerHTML: '' }],
      ['scanFlash', { className: '', classList: { remove: vi.fn() } }]
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

  it('tests and triggers spreadsheet sync through configured url', async () => {
    ctx.state.scriptUrl = 'https://script.google.com/macros/s/test/exec';
    const button = {
      tagName: 'BUTTON',
      disabled: false,
      innerHTML: 'Sincronizar',
      dataset: {},
      classList: { toggle: vi.fn() }
    };

    const testPromise = ctx.testarPlanilha(button);
    while (timeouts.length) {
      const timer = timeouts.shift();
      timer.fn();
    }
    await testPromise;

    const syncPromise = ctx.sincronizarPlanilha(true, button);
    while (timeouts.length) {
      const timer = timeouts.shift();
      timer.fn();
    }
    await syncPromise;

    expect(ctx.fetch).toHaveBeenCalledWith(expect.stringContaining('?action=ping'), { mode: 'no-cors' });
    expect(ctx.fetch).toHaveBeenCalledWith(expect.stringContaining('syncPlanilha&token='), { mode: 'no-cors' });
    expect(elements.get('toastTitle').textContent).toContain('Atualizacao');
  });

  it('renders progress rooms and tempo estimado summary', () => {
    ctx.state.scans = [
      { id: '1', type: 'scan', room: 'ALMOXARIFADO (Bloco A)', ts: new Date().toISOString() },
      { id: '2', type: 'scan', room: 'ALMOXARIFADO (Bloco A)', ts: new Date().toISOString() },
      { id: '3', type: 'scan', room: 'BIBLIOTECA (Bloco A)', ts: new Date().toISOString() },
      { id: '4', type: 'scan', room: 'BIBLIOTECA (Bloco A)', ts: new Date().toISOString() },
      { id: '5', type: 'scan', room: 'BIBLIOTECA (Bloco A)', ts: new Date().toISOString() },
      { id: '6', type: 'nopat', room: 'BIBLIOTECA (Bloco A)', ts: new Date().toISOString() }
    ];
    ctx.suapTotais = {
      'ALMOXARIFADO (Bloco A)': 10,
      'BIBLIOTECA (Bloco A)': 12
    };

    ctx.renderProgressRooms();

    expect(elements.get('progTotal').textContent).toBe(6);
    expect(elements.get('progSalas').textContent).toBe(2);
    expect(elements.get('progNopat').textContent).toBe(1);
    expect(elements.get('progRoomList').innerHTML).toContain('BIBLIOTECA');
    expect(elements.get('progTempoEstimado').style.display).toBe('block');
  });

  it('keeps local session intact when clear is cancelled', () => {
    ctx.confirm = vi.fn(() => false);

    ctx.confirmClear();

    expect(ctx.state.scans).toHaveLength(2);
    expect(ctx.saveScans).not.toHaveBeenCalled();
  });

  it('handles busy state for non-button items', () => {
    const arrow = { innerHTML: '>', dataset: {} };
    const sub = { textContent: 'Original', dataset: {} };
    const card = {
      tagName: 'DIV',
      classList: { toggle: vi.fn() },
      querySelector: vi.fn((selector) => {
        if (selector === '.si-arrow') return arrow;
        if (selector === '.si-sub') return sub;
        return null;
      })
    };

    ctx.setActionBusy(card, true, 'Atualizando...');
    expect(sub.textContent).toBe('Atualizando...');

    ctx.setActionBusy(card, false, 'Atualizando...');
    expect(arrow.innerHTML).toBe('>');
    expect(sub.textContent).toBe('Original');
  });

  it('shows warnings when spreadsheet url is missing and flashes scan feedback', async () => {
    const button = {
      tagName: 'BUTTON',
      disabled: false,
      innerHTML: 'Testar',
      dataset: {},
      classList: { toggle: vi.fn() }
    };

    const testPromise = ctx.testarPlanilha(button);
    while (timeouts.length) {
      const timer = timeouts.shift();
      timer.fn();
    }
    await testPromise;
    expect(elements.get('toastTitle').textContent).toContain('URL nao configurada');

    ctx.flashScan('ok');
    expect(elements.get('scanFlash').className).toContain('show');
  });
});
