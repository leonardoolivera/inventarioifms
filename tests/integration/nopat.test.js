import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('no-pat integration', () => {
  let elements;
  let photoArea;
  let placeholder;
  let ctx;

  beforeEach(() => {
    placeholder = { style: { display: '' } };
    photoArea = {
      querySelector(selector) {
        if (selector === 'img') return null;
        if (selector === '.photo-placeholder') return placeholder;
        return null;
      },
      appendChild() {}
    };

    elements = new Map([
      ['noPatDesc', { value: 'Cadeira giratoria preta', focus: vi.fn() }],
      ['noPatRoom', { innerHTML: '', textContent: '' }],
      ['miniRoomPicker', { style: { display: 'none' }, innerHTML: '' }],
      ['photoArea', photoArea],
      ['noPatModal', { classList: { add: vi.fn(), remove: vi.fn() } }]
    ]);

    ctx = runLegacyScript('js/features/nopat.js', {
      state: {
        currentRoom: 'ALMOXARIFADO (Bloco A)',
        rooms: ['ALMOXARIFADO (Bloco A)', 'BIBLIOTECA (Bloco A)'],
        scans: []
      },
      currentUser: { siape: '2394174', nome: 'Leonardo Alexandre' },
      noPatEstado: 'Excelente',
      noPatPhoto: null,
      uid: () => 'nopat-1',
      esc: (value) => String(value || ''),
      photoCache: {},
      idbSalvarFoto: vi.fn(),
      saveScans: vi.fn(),
      addToPendingSync: vi.fn(),
      updateStats: vi.fn(),
      renderHistList: vi.fn(),
      showToast: vi.fn(),
      navigator: { vibrate: vi.fn() },
      localStorage: { getItem: vi.fn(() => null) },
      abrirCamera: vi.fn(),
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        },
        createElement() {
          return {
            style: {},
            setAttribute() {},
            addEventListener() {},
            click() {}
          };
        },
        body: {
          appendChild() {},
          removeChild() {}
        },
        querySelectorAll() {
          return [{ classList: { remove: vi.fn() } }];
        },
        querySelector() {
          return { classList: { add: vi.fn() } };
        }
      }
    });
  });

  it('opens modal with current room preselected', () => {
    ctx.openNoPatModal();

    expect(elements.get('noPatRoom').innerHTML).toContain('ALMOXARIFADO (Bloco A)');
    expect(elements.get('miniRoomPicker').style.display).toBe('none');
    expect(elements.get('noPatModal').classList.add).toHaveBeenCalledWith('show');
  });

  it('saves item without patrimonio into local state and pending sync', () => {
    ctx.saveNoPat();

    expect(ctx.state.scans).toHaveLength(1);
    expect(ctx.state.scans[0]).toMatchObject({
      id: 'nopat-1',
      type: 'nopat',
      room: 'ALMOXARIFADO (Bloco A)',
      desc: 'Cadeira giratoria preta',
      estado: 'Excelente',
      funcionario: 'Leonardo Alexandre',
      siape: '2394174'
    });
    expect(ctx.addToPendingSync).toHaveBeenCalledWith(expect.objectContaining({ id: 'nopat-1' }));
    expect(ctx.showToast).toHaveBeenCalled();
  });
});
