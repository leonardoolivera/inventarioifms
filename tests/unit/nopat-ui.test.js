import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('nopat helpers', () => {
  let elements;
  let modalClasses;
  let placeholder;
  let excellentChip;
  let picker;
  let ctx;
  let previewImg;
  let fileInput;

  beforeEach(() => {
    localStorage.clear();
    modalClasses = { add: vi.fn(), remove: vi.fn() };
    placeholder = { style: { display: '' } };
    excellentChip = { classList: { add: vi.fn(), remove: vi.fn() } };
    picker = { style: { display: 'none' }, innerHTML: '' };
    previewImg = { remove: vi.fn(), style: {}, src: '' };
    fileInput = null;

    elements = new Map([
      ['noPatDesc', { value: '', focus: vi.fn() }],
      ['noPatRoom', { innerHTML: '', textContent: '' }],
      ['miniRoomPicker', picker],
      ['photoArea', {
        appended: [],
        appendChild(node) {
          this.appended.push(node);
        },
        querySelector: vi.fn((selector) => {
          if (selector === '.photo-placeholder') return placeholder;
          if (selector === 'img') return previewImg;
          return null;
        })
      }],
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
      sugerirDescricao: vi.fn(),
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
          if (!fileInput) {
            fileInput = {
              className: '',
              textContent: '',
              style: {},
              type: '',
              accept: '',
              files: [],
              setAttribute: vi.fn(),
              addEventListener: vi.fn(function(_event, cb) {
                this._change = cb;
              }),
              click: vi.fn(),
              outerHTML: '<input />'
            };
            return fileInput;
          }
          return {
            className: '',
            textContent: '',
            style: {},
            src: '',
            setAttribute(name, value) {
              this[name] = value;
            },
            get outerHTML() {
              return '<div class="' + this.className + '">' + this.textContent + '</div>';
            }
          };
        }
      },
      FileReader: function FileReaderMock() {
        this.readAsDataURL = vi.fn(() => {
          this.onload({ target: { result: 'data:image/jpeg;base64,ZmFrZQ==' } });
        });
      },
      setTimeout: vi.fn((fn) => {
        fn();
        return 1;
      })
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
    expect(previewImg.remove).toHaveBeenCalled();
  });

  it('toggles room picker and applies room choice', () => {
    ctx.toggleRoomPicker();
    expect(picker.style.display).toBe('block');

    ctx.toggleRoomPicker();
    expect(picker.style.display).toBe('none');

    ctx.selectNoPatRoom('BIBLIOTECA (Bloco A)');
    expect(elements.get('noPatRoom').innerHTML).toContain('BIBLIOTECA');
    expect(picker.style.display).toBe('none');
  });

  it('changes estado chip selection and closes modal', () => {
    const otherChip = { classList: { add: vi.fn(), remove: vi.fn() } };
    ctx.document.querySelectorAll = vi.fn(() => [excellentChip, otherChip]);

    ctx.selectEstado('Regular', otherChip);
    ctx.closeNoPatModal();

    expect(ctx.noPatEstado).toBe('Regular');
    expect(otherChip.classList.add).toHaveBeenCalledWith('selected');
    expect(modalClasses.remove).toHaveBeenCalledWith('show');
  });

  it('processes selected photo and updates preview', async () => {
    ctx.resizeImage = vi.fn(() => Promise.resolve('data:image/jpeg;base64,cmVzaXplZA=='));
    ctx.abrirCamera();
    fileInput.files = [{ name: 'foto.jpg' }];
    fileInput._change({ target: fileInput });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.noPatPhoto).toContain('cmVzaXplZA');
    expect(placeholder.style.display).toBe('none');
    expect(ctx.sugerirDescricao).toHaveBeenCalledWith(true);
    expect(elements.get('suggestBtn').style.display).toBe('inline-flex');
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

  it('loads currentUser from localStorage when needed', () => {
    localStorage.setItem('currentUser', JSON.stringify({ nome: 'Servidor Local', siape: '7777' }));
    ctx.currentUser = null;
    elements.get('noPatDesc').value = 'Cadeira';

    ctx.saveNoPat();

    expect(ctx.state.scans[0].funcionario).toBe('Servidor Local');
    expect(ctx.state.scans[0].siape).toBe('7777');
  });

  it('requires description before saving', () => {
    elements.get('noPatDesc').value = '';

    ctx.saveNoPat();

    expect(elements.get('noPatDesc').focus).toHaveBeenCalled();
    expect(ctx.state.scans).toHaveLength(0);
  });
});
