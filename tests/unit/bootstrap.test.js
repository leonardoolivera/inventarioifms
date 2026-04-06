import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('bootstrap app ui', () => {
  let events;
  let timeouts;
  let intervals;
  let ctx;

  beforeEach(() => {
    events = {};
    timeouts = [];
    intervals = [];

    ctx = runLegacyScript('js/core/bootstrap.js', {
      APP_VERSION: 'v1.2.3',
      state: { isOnline: true, pendingSync: [{ id: '1' }] },
      _mostrarBoasVindas: true,
      addEventListener: vi.fn((name, handler) => {
        events[name] = handler;
      }),
      document: {
        getElementById(id) {
          return { id, textContent: '' };
        }
      },
      updateHomeStatus: vi.fn(),
      updateRoomLabel: vi.fn(),
      updateStats: vi.fn(),
      updateSyncBanner: vi.fn(),
      renderRoomList: vi.fn(),
      renderHistList: vi.fn(),
      renderSettRooms: vi.fn(),
      loadScriptUrl: vi.fn(),
      loadGeminiKey: vi.fn(),
      syncNow: vi.fn(),
      checkForUpdate: vi.fn(),
      showToast: vi.fn(),
      setTimeout: vi.fn((fn, ms) => {
        timeouts.push({ fn, ms });
        return timeouts.length;
      }),
      setInterval: vi.fn((fn, ms) => {
        intervals.push({ fn, ms });
        return intervals.length;
      })
    });
  });

  it('initializes main ui surfaces and schedules background work', () => {
    ctx.bootstrapAppUI();

    expect(ctx.updateHomeStatus).toHaveBeenCalled();
    expect(ctx.updateRoomLabel).toHaveBeenCalled();
    expect(ctx.renderRoomList).toHaveBeenCalled();
    expect(ctx.renderHistList).toHaveBeenCalled();
    expect(ctx.renderSettRooms).toHaveBeenCalled();
    expect(ctx.loadScriptUrl).toHaveBeenCalled();
    expect(ctx.loadGeminiKey).toHaveBeenCalled();
    expect(ctx.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(ctx.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(timeouts.some((item) => item.ms === 2000)).toBe(true);
    expect(timeouts.some((item) => item.ms === 1500)).toBe(true);
    expect(intervals.some((item) => item.ms === 30000)).toBe(true);
  });

  it('updates online state when connectivity listeners fire', () => {
    ctx.bootstrapAppUI();

    events.offline();
    expect(ctx.state.isOnline).toBe(false);

    events.online();
    expect(ctx.state.isOnline).toBe(true);
    expect(ctx.syncNow).toHaveBeenCalled();
  });
});
