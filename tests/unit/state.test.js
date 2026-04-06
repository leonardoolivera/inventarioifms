import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('state bootstrap', () => {
  beforeEach(() => {
    localStorage.clear();
    delete globalThis.state;
    delete globalThis.createAppState;
    delete globalThis.screenHistory;
  });

  it('hydrates state from storage when enough room data exists', () => {
    localStorage.setItem('currentRoom', 'BIBLIOTECA');
    localStorage.setItem('rooms', JSON.stringify(Array.from({ length: 11 }, (_, i) => `Sala ${i}`)));
    localStorage.setItem('pinnedRooms', JSON.stringify(['Sala 1']));
    localStorage.setItem('hiddenRooms', JSON.stringify(['Sala 2']));
    localStorage.setItem('scans', JSON.stringify([{ id: '1' }]));
    localStorage.setItem('pendingSync', JSON.stringify([{ id: '2' }]));
    localStorage.setItem('scriptUrl', 'https://example.com/script');

    const ctx = runLegacyScript('js/core/state.js', {
      navigator: { onLine: true },
      getSalasSUAP: vi.fn(() => ['Fallback'])
    });

    expect(ctx.state.currentRoom).toBe('BIBLIOTECA');
    expect(ctx.state.rooms).toHaveLength(11);
    expect(ctx.state.pinnedRooms).toEqual(['Sala 1']);
    expect(ctx.state.hiddenRooms).toEqual(['Sala 2']);
    expect(ctx.state.scans).toEqual([{ id: '1' }]);
    expect(ctx.state.pendingSync).toEqual([{ id: '2' }]);
    expect(ctx.state.scriptUrl).toBe('https://example.com/script');
    expect(ctx.screenHistory).toEqual([]);
  });

  it('falls back to suap rooms when saved list is too small', () => {
    localStorage.setItem('rooms', JSON.stringify(['Curta']));

    const ctx = runLegacyScript('js/core/state.js', {
      navigator: { onLine: false },
      getSalasSUAP: vi.fn(() => ['SUAP 1', 'SUAP 2'])
    });

    expect(ctx.getSalasSUAP).toHaveBeenCalled();
    expect(ctx.state.rooms).toEqual(['SUAP 1', 'SUAP 2']);
    expect(ctx.state.isOnline).toBe(false);
  });
});
