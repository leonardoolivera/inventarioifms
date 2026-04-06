import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('scan core', () => {
  let ctx;

  beforeEach(() => {
    ctx = runLegacyScript('js/features/scan-core.js', {
      state: {
        scans: [],
        currentRoom: 'ALMOXARIFADO (Bloco A)',
        isOnline: false
      },
      currentUser: { siape: '2394174', nome: 'Leonardo Alexandre' },
      uid: () => 'scan-id',
      saveScans: vi.fn(),
      addToPendingSync: vi.fn(),
      updateStats: vi.fn(),
      renderHistList: vi.fn(),
      atualizarContextoScanner: vi.fn(),
      flashScan: vi.fn(),
      showUndoBar: vi.fn(),
      showToast: vi.fn(),
      lookupPatrimonio: vi.fn(),
      checkDuplicate: vi.fn(),
      mostrarAvisoSala: vi.fn(),
      fmtTime: () => '13:45',
      localStorage: { getItem: vi.fn(() => null) },
      setTimeout: vi.fn((fn) => {
        fn();
        return 1;
      })
    });
  });

  it('normalizes leading zeros', () => {
    expect(ctx.normCod('00086889')).toBe('86889');
    expect(ctx.normCod('000')).toBe('0');
  });

  it('shows duplicate warning and does not commit duplicate local scan', () => {
    ctx.state.scans.push({ type: 'scan', code: '86889', room: 'BIBLIOTECA', ts: new Date().toISOString() });
    ctx.commitScan = vi.fn();

    ctx.processScan('00086889');

    expect(ctx.commitScan).not.toHaveBeenCalled();
    expect(ctx.flashScan).toHaveBeenCalledWith('warn');
    expect(ctx.showToast).toHaveBeenCalled();
  });

  it('commits new scan when code is not duplicated', () => {
    ctx.commitScan = vi.fn();

    ctx.processScan('86889');

    expect(ctx.commitScan).toHaveBeenCalledWith('86889');
  });

  it('checks duplicate remotely when online', async () => {
    ctx.state.isOnline = true;
    ctx.checkDuplicate = vi.fn(() => Promise.resolve({ duplicado: true, quem: 'Maria', local: 'BIBLIOTECA' }));
    ctx.commitScan = vi.fn();

    ctx.processScan('86889');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.checkDuplicate).toHaveBeenCalledWith('86889');
    expect(ctx.showToast).toHaveBeenCalledWith('dup', expect.stringContaining('Patrim'), expect.stringContaining('Maria'));
  });

  it('updates undo details and triggers wrong-room warning after repeated mismatch', async () => {
    const undoSub = { textContent: '' };
    ctx.state.isOnline = true;
    ctx.document = {
      getElementById(id) {
        return id === 'undoSub' ? undoSub : null;
      }
    };
    ctx.lookupPatrimonio = vi.fn(() => Promise.resolve({ ok: true, descricao: 'Notebook', salaOriginal: 'BIBLIOTECA' }));

    ctx.commitScan('1001');
    ctx.commitScan('1002');
    ctx.commitScan('1003');

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(undoSub.textContent).toContain('Notebook');
    expect(ctx.mostrarAvisoSala).toHaveBeenCalledWith('BIBLIOTECA', ['scan-id', 'scan-id', 'scan-id']);
  });
});
