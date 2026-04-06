import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('nopat helpers', () => {
  let elements;
  let modalClasses;
  let placeholder;
  let excellentChip;
  let picker;
  let ctx;

  beforeEach(() => {
    localStorage.clear();
    modalClasses = { add: vi.fn(), remove: vi.fn() };
    placeholder = { style: { display: '' } };
    excellentChip = { classList: { add: vi.fn(), remove: vi.fn() } };
    picker = { style: { display: 'none' }, innerHTML: '' };

    elements = new Map([
      ['noPatDesc', { value: '', focus: vi.fn() }],
      ['noPatRoom', { innerHTML: '', textContent: '' }],
      ['miniRoomPicker', picker],
      ['photoArea', { querySelector: vi.fn((selector) => (selector === '.photo-placeholder' ? placeholder : null)) }],
      ['noPatModal', { classList: modalClasses }],
      ['suggestBtn', { style: { display: 'none' }, innerHTML: '' }]
    ]);

    ctx = runLegacyScript('js/features/nopat.js', {
      noPatPhoto: null,
      noPatEstado: '',
      currentUser: { nome: 'Leonardo Alexandre', siape: '2394174' },
      photoCache: {},
      state: {
        currentRoom: 'ALMOXARIFADO (Bloco A)',
        rooms: ['ALMOXARIFADO (Bloco A)', 'BIBLIOTECA (Bloco A)'],
        scans: []
      },
      esc: (value) => String(value || ''),
      uid: vi.fn(() => 'nopat-1'),
      idbSalvarFoto: vi.fn(),
      saveScans: vi.fn(),
      addToPendingSync: vi.fn(),
      updateStats: vi.fn(),
      renderHistList: vi.fn(),
      showToast: vi.fn(),
      navigator: { vibrate: vi.fn() },
      document: {
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn()
        },
        getElementById(id) {
          return elements.get(id) || null;
        },
        querySelectorAll(selector) {
          return selector === '.estado-chip' ? [excellentChip] : [];
        },
        querySelector(selector) {
          return selector === '.estado-chip.excelente' ? excellentChip : null;
        },
        createElement() {
          return {
            className: '',
            textContent: '',
            style: {},
            type: '',
            accept: '',
            files: [],
            setAttribute: vi.fn(),
            addEventListener: vi.fn(),
            click: vi.fn(),
            outerHTML: '<div></div>'
          };
        }
      },
      setTimeout: vi.fn()
    });
  });

  it('opens modal with default room and selected estado', () => {
    ctx.openNoPatModal();

    expect(ctx.document.body.appendChild).toHaveBeenCalled();
    expect(elements.get('noPatRoom').innerHTML).toContain('ALMOXARIFADO');
    expect(picker.style.display).toBe('none');
    expect(placeholder.style.display).toBe('');
    expect(excellentChip.classList.add).toHaveBeenCalledWith('selected');
    expect(modalClasses.add).toHaveBeenCalledWith('show');
  });

  it('toggles room picker and applies room choice', () => {
    ctx.toggleRoomPicker();
    expect(picker.style.display).toBe('block');

    ctx.selectNoPatRoom('BIBLIOTECA (Bloco A)');
    expect(elements.get('noPatRoom').innerHTML).toContain('BIBLIOTECA');
    expect(picker.style.display).toBe('none');
  });

  it('saves nopat item and updates local state', () => {
    elements.get('noPatDesc').value = 'Monitor 19';
    ctx.noPatEstado = 'Bom';
    ctx.noPatPhoto = 'data:image/jpeg;base64,ZmFrZQ==';
    ctx.noPatRoom_selected = 'BIBLIOTECA (Bloco A)';

    ctx.saveNoPat();

    expect(ctx.state.scans).toHaveLength(1);
    expect(ctx.state.scans[0]).toEqual(expect.objectContaining({
      id: 'nopat-1',
      type: 'nopat',
      room: 'BIBLIOTECA (Bloco A)',
      desc: 'Monitor 19',
      siape: '2394174'
    }));
    expect(ctx.photoCache['nopat-1']).toContain('data:image/jpeg');
    expect(ctx.idbSalvarFoto).toHaveBeenCalled();
    expect(ctx.addToPendingSync).toHaveBeenCalled();
    expect(modalClasses.remove).toHaveBeenCalledWith('show');
    expect(ctx.navigator.vibrate).toHaveBeenCalled();
  });
});
