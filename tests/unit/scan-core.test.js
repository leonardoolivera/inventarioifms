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
      localStorage: { getItem: vi.fn(() => null) }
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
});
