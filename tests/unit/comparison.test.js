import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('comparison helpers', () => {
  let elements;
  let activeButton;
  let filterButtons;
  let roomTitle;
  let roomSub;
  let ctx;

  beforeEach(() => {
    activeButton = { classList: { add: vi.fn(), remove: vi.fn() } };
    roomTitle = { textContent: '' };
    roomSub = { textContent: '' };
    filterButtons = [
      { classList: { add: vi.fn(), remove: vi.fn() } },
      { classList: { add: vi.fn(), remove: vi.fn() } }
    ];

    elements = new Map([
      ['compTitle', { textContent: '' }],
      ['compSub', { textContent: '' }],
      ['compList', { innerHTML: '' }],
      ['compCorreto', { textContent: '' }],
      ['compOutro', { textContent: '' }],
      ['compNao', { textContent: '' }],
      ['compPend', { textContent: '' }],
      ['roomHistTitle', { textContent: '' }],
      ['roomHistSub', { textContent: '' }],
      ['roomHistList', { innerHTML: '' }],
      ['msSalasTitulo', { textContent: '' }],
      ['msSubtitulo', { textContent: '' }]
    ]);

    ctx = runLegacyScript('js/features/comparison.js', {
      state: {
        scans: [
          { id: '1', type: 'scan', room: 'ALMOXARIFADO (Bloco A)', code: '86889', ts: '2026-04-05T12:00:00.000Z', synced: true },
          { id: '2', type: 'nopat', room: 'ALMOXARIFADO (Bloco A)', desc: 'Monitor', estado: 'Bom', ts: '2026-04-05T12:05:00.000Z', synced: false }
        ]
      },
      currentUser: { nome: 'Leonardo Alexandre', siape: '2394174' },
      abreviarSala: (room) => ({ curto: room, bloco: 'Bloco A' }),
      showScreen: vi.fn(),
      renderMinhasSalas: vi.fn(),
      showToast: vi.fn(),
      getComparacaoSala: vi.fn(() => Promise.resolve({
        ok: true,
        porSala: {
          'BIBLIOTECA (Bloco A)': [['99001', 'Projetor', 'pendente', '', '']]
        }
      })),
      fmtTime: () => '12:00',
      esc: (value) => String(value || ''),
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        },
        querySelectorAll(selector) {
          if (selector === '.comp-filter-btn') return filterButtons;
          return [];
        },
        querySelector(selector) {
          if (selector === '.comp-filter-btn') return activeButton;
          if (selector === '#scRooms .topbar-title') return roomTitle;
          if (selector === '#scRooms .topbar-sub') return roomSub;
          return null;
        }
      }
    });
    ctx.compCache = {
      'ALMOXARIFADO (Bloco A)': [
        ['86889', 'Estante', 'correto', '', 'Leo'],
        ['86890', 'Notebook', 'outro_local', 'BIBLIOTECA (Bloco A)', 'Maria'],
        ['86891', 'Switch', 'nao_localizado', '', '']
      ]
    };
    ctx.compSalaAtual = 'ALMOXARIFADO (Bloco A)';
  });

  it('updates counters and renders comparison list', () => {
    ctx.mostrarCompSala('ALMOXARIFADO (Bloco A)');

    expect(String(elements.get('compCorreto').textContent)).toBe('1');
    expect(String(elements.get('compOutro').textContent)).toBe('1');
    expect(elements.get('compList').innerHTML).toContain('86889');
    expect(activeButton.classList.add).toHaveBeenCalledWith('active');
  });

  it('filters comparison list by status', () => {
    ctx.compSalaAtual = 'ALMOXARIFADO (Bloco A)';
    ctx.filtrarComp('outro_local', filterButtons[1]);

    expect(filterButtons[1].classList.add).toHaveBeenCalledWith('active');
    expect(elements.get('compList').innerHTML).toContain('86890');
    expect(elements.get('compList').innerHTML).not.toContain('86889');
  });

  it('opens selection flow and loads comparison data when cache is empty', async () => {
    ctx.compCache = null;

    ctx.abrirSelecaoComparacao();
    expect(ctx._modoComparacao).toBe(true);
    expect(roomTitle.textContent).toContain('Selecionar sala');
    expect(roomSub.textContent).toContain('compar');

    ctx.abrirComparacao('BIBLIOTECA (Bloco A)');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(elements.get('compTitle').textContent).toContain('BIBLIOTECA');
    expect(ctx.showScreen).toHaveBeenCalledWith('scComparacao');
    expect(elements.get('compList').innerHTML).toContain('99001');
  });

  it('renders room history for a selected room', () => {
    ctx.showRoomHistory('ALMOXARIFADO (Bloco A)');

    expect(elements.get('roomHistTitle').textContent).toContain('ALMOXARIFADO');
    expect(elements.get('roomHistSub').textContent).toContain('2 itens');
    expect(elements.get('roomHistList').innerHTML).toContain('86889');
    expect(ctx.showScreen).toHaveBeenCalledWith('scRoomHist');
  });

  it('opens my rooms screen with current user summary', () => {
    ctx.showMinhasSalas();

    expect(elements.get('msSalasTitulo').textContent).toBe('Leonardo');
    expect(elements.get('msSubtitulo').textContent).toContain('2394174');
    expect(ctx.renderMinhasSalas).toHaveBeenCalled();
    expect(ctx.showScreen).toHaveBeenCalledWith('scMinhasSalas');
  });
});
