import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('wrong room alerts', () => {
  let elements;
  let intervals;
  let ctx;

  beforeEach(() => {
    intervals = [];
    elements = new Map([
      ['wrongRoomModal', { classList: { add: vi.fn(), remove: vi.fn() } }],
      ['wrongRoomMsg', { innerHTML: '' }],
      ['wrongRoomSugerida', { disabled: false, innerHTML: '', style: { opacity: '1' }, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; } }],
      ['wrongRoomCountdown', { textContent: '' }]
    ]);

    ctx = runLegacyScript('js/features/room-alerts.js', {
      state: {
        currentRoom: 'BIBLIOTECA (Bloco A)',
        scans: [{ id: '1', room: 'BIBLIOTECA (Bloco A)' }],
        isOnline: true
      },
      abreviarSala: (room) => ({ curto: room.replace(/\s*\([^)]+\)/, ''), bloco: 'Bloco A' }),
      esc: (value) => String(value || ''),
      selectRoom: vi.fn(),
      saveScans: vi.fn(),
      updateStats: vi.fn(),
      renderHistList: vi.fn(),
      showToast: vi.fn(),
      corrigirSala: vi.fn(() => Promise.resolve({ ok: true })),
      confirm: vi.fn(() => true),
      compCache: { any: true },
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      },
      setInterval: vi.fn((fn) => {
        intervals.push(fn);
        return intervals.length;
      }),
      clearInterval: vi.fn()
    });
  });

  it('shows modal and enables suggested room action after countdown', () => {
    ctx.mostrarAvisoSala('ALMOXARIFADO (Bloco A)', ['1', '2', '3']);

    expect(elements.get('wrongRoomModal').classList.add).toHaveBeenCalledWith('show');
    expect(elements.get('wrongRoomMsg').innerHTML).toContain('sala certa');
    expect(elements.get('wrongRoomSugerida').disabled).toBe(true);

    intervals[0]();
    intervals[0]();

    expect(elements.get('wrongRoomSugerida').disabled).toBe(false);
    expect(elements.get('wrongRoomSugerida').innerHTML).toContain('Sim, trocar sala');
  });

  it('switches room and corrects wrong scans when confirmed', async () => {
    elements.get('wrongRoomSugerida').setAttribute('data-sala', 'ALMOXARIFADO (Bloco A)');
    elements.get('wrongRoomSugerida').setAttribute('data-ids', JSON.stringify(['1']));

    ctx.trocarParaSalasSugerida();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.selectRoom).toHaveBeenCalledWith('ALMOXARIFADO (Bloco A)');
    expect(ctx.state.scans[0].room).toBe('ALMOXARIFADO (Bloco A)');
    expect(ctx.corrigirSala).toHaveBeenCalledWith(['1'], 'ALMOXARIFADO (Bloco A)');
    expect(ctx.showToast).toHaveBeenCalled();
  });
});
