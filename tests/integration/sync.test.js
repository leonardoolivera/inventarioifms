import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('sync integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  it('adds pending item once and schedules sync when online', () => {
    const ctx = runLegacyScript('js/features/sync.js', {
      state: {
        pendingSync: [],
        isOnline: true,
        scans: []
      },
      setSyncState: vi.fn(),
      renderHomeSummary: vi.fn()
    });

    ctx.syncNow = vi.fn();

    ctx.addToPendingSync({ id: 'scan-1' });
    ctx.addToPendingSync({ id: 'scan-1' });

    expect(ctx.state.pendingSync).toEqual(['scan-1']);
    expect(JSON.parse(localStorage.getItem('pendingSync'))).toEqual(['scan-1']);

    vi.advanceTimersByTime(2000);
    expect(ctx.syncNow).toHaveBeenCalledTimes(1);
  });

  it('skips sync when offline or without pending items', async () => {
    const ctx = runLegacyScript('js/features/sync.js', {
      state: {
        pendingSync: [],
        isOnline: false,
        scans: []
      },
      renderHomeSummary: vi.fn()
    });

    await expect(ctx.syncNow()).resolves.toEqual({ ok: false, skipped: true });

    ctx.state.isOnline = true;
    await expect(ctx.syncNow()).resolves.toEqual({ ok: false, skipped: true });
  });

  it('synchronizes pending scans, updates flags and clears photo cache', async () => {
    const batchSync = vi.fn().mockResolvedValue({ ok: true });
    const sincronizarPlanilha = vi.fn();
    const idbDeletarFoto = vi.fn();

    const ctx = runLegacyScript('js/features/sync.js', {
      state: {
        pendingSync: ['scan-1', 'nopat-1'],
        isOnline: true,
        scans: [
          {
            id: 'scan-1',
            type: 'scan',
            code: '86889',
            room: 'ALMOXARIFADO (Bloco A)',
            ts: '2026-04-05T12:00:00.000Z',
            synced: false,
            funcionario: 'Leonardo Alexandre',
            siape: '2394174'
          },
          {
            id: 'nopat-1',
            type: 'nopat',
            desc: 'Monitor',
            room: 'BIBLIOTECA (Bloco A)',
            ts: '2026-04-05T12:05:00.000Z',
            synced: false,
            funcionario: 'Leonardo Alexandre',
            siape: '2394174'
          }
        ]
      },
      photoCache: {},
      idbCarregarFoto: vi.fn().mockResolvedValue('foto-base64'),
      idbDeletarFoto,
      batchSync,
      setSyncState: vi.fn(),
      sincronizarPlanilha,
      renderHomeSummary: vi.fn()
    });
    const saveScansSpy = vi.spyOn(ctx, 'saveScans');
    ctx.renderHistList = vi.fn();
    const updateSyncBannerSpy = vi.spyOn(ctx, 'updateSyncBanner');

    const result = await ctx.syncNow();

    expect(result).toEqual({ ok: true, sincronizados: 2 });
    expect(batchSync).toHaveBeenCalledTimes(1);
    expect(batchSync).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'scan-1', code: '86889' }),
      expect.objectContaining({ id: 'nopat-1', desc: 'Monitor', photo: 'foto-base64' })
    ]);
    expect(ctx.state.pendingSync).toEqual([]);
    expect(ctx.state.scans.every((scan) => scan.synced)).toBe(true);
    expect(idbDeletarFoto).toHaveBeenCalledWith('scan-1');
    expect(idbDeletarFoto).toHaveBeenCalledWith('nopat-1');
    expect(saveScansSpy).toHaveBeenCalled();
    expect(ctx.renderHistList).toHaveBeenCalled();
    expect(updateSyncBannerSpy).toHaveBeenCalled();
    expect(sincronizarPlanilha).toHaveBeenCalledWith(false);
  });
});
