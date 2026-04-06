import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

function createCampusCard() {
  const detailNodes = [];
  return {
    classList: {
      state: new Set(),
      contains(value) {
        return this.state.has(value);
      },
      add(value) {
        this.state.add(value);
      },
      remove(value) {
        this.state.delete(value);
      }
    },
    querySelector() {
      return detailNodes.pop() || null;
    },
    insertAdjacentHTML(_position, html) {
      detailNodes.push({
        html,
        remove: vi.fn()
      });
    }
  };
}

describe('salas campus and progress flows', () => {
  let elements;
  let cards;
  let ctx;
  let fetchComparacao;
  let fetchTotais;

  beforeEach(() => {
    localStorage.clear();
    cards = new Map();
    elements = new Map([
      ['campusList', { innerHTML: '' }],
      ['campusSub', { textContent: '' }]
    ]);
    fetchComparacao = vi.fn();
    fetchTotais = vi.fn();

    ctx = runLegacyScript('js/features/salas.js', {
      SALA_MAP: {
        'ALMOXARIFADO (Bloco A)': { curto: 'Almoxarifado', bloco: 'Bloco A', emoji: '📦' },
        'BIBLIOTECA (Bloco A)': { curto: 'Biblioteca', bloco: 'Bloco A', emoji: '📚' },
        'PATIO (Area Externa)': { curto: 'Patio', bloco: 'Area Externa', emoji: '📍' }
      },
      state: {
        rooms: ['ALMOXARIFADO (Bloco A)', 'BIBLIOTECA (Bloco A)', 'PATIO (Area Externa)'],
        scans: [],
        currentRoom: '',
        pinnedRooms: [],
        hiddenRooms: []
      },
      suapTotais: null,
      suapEncontrados: null,
      window: {
        _modoComparacao: false,
        _selecionandoParaScan: false
      },
      esc: (value) => String(value || ''),
      escJ: (value) => String(value || ''),
      showScreen: vi.fn(),
      showMinhasSalas: vi.fn(),
      renderHomeSummary: vi.fn(),
      showToast: vi.fn(),
      getComparacaoSala: fetchComparacao,
      getTotalPorSala: fetchTotais,
      setTimeout: vi.fn((fn) => {
        fn();
        return 1;
      }),
      document: {
        getElementById(id) {
          if (id.startsWith('ccard-')) return cards.get(id) || null;
          return elements.get(id) || null;
        },
        querySelectorAll() {
          return Array.from(cards.values()).filter((card) => card.classList.contains('open'));
        }
      }
    });
  });

  it('loads and renders campus grouped by block', async () => {
    fetchComparacao.mockResolvedValue({
      ok: true,
      porSala: {
        'ALMOXARIFADO (Bloco A)': [['86889', 'Estante de aco', 'correto', '', 'Leo']],
        'BIBLIOTECA (Bloco A)': [['86890', 'Notebook', 'outro_local', 'BIBLIOTECA (Bloco A)', 'Leo']]
      }
    });

    await ctx.carregarCampus();

    expect(elements.get('campusList').innerHTML).toContain('Bloco A');
    expect(elements.get('campusList').innerHTML).toContain('Almoxarifado');
    expect(elements.get('campusSub').textContent).toContain('3 salas');
  });

  it('opens and closes campus room details', () => {
    ctx.campusData = {
      'ALMOXARIFADO (Bloco A)': [['86889', 'Estante de aco', 'correto', '', 'Leo']]
    };
    const cardA = createCampusCard();
    const cardB = createCampusCard();
    cardB.classList.add('open');
    cards.set('ccard-' + encodeURIComponent('ALMOXARIFADO (Bloco A)'), cardA);
    cards.set('ccard-' + encodeURIComponent('BIBLIOTECA (Bloco A)'), cardB);

    ctx.toggleCampusSala('ALMOXARIFADO (Bloco A)', cardA);
    expect(cardA.classList.contains('open')).toBe(true);

    ctx.toggleCampusSala('ALMOXARIFADO (Bloco A)', cardA);
    expect(cardA.classList.contains('open')).toBe(false);
  });

  it('shows empty state when campus room has no registered items', () => {
    ctx.campusData = { 'PATIO (Area Externa)': [] };
    const card = createCampusCard();
    cards.set('ccard-' + encodeURIComponent('PATIO (Area Externa)'), card);

    ctx.abrirDetalheCampus('PATIO (Area Externa)', card);

    expect(card.classList.contains('open')).toBe(true);
  });

  it('loads suap totals once and refreshes home summary', async () => {
    fetchTotais.mockResolvedValue({
      ok: true,
      salas: [
        { sala_suap: 'ALMOXARIFADO (Bloco A)', total: 12, correto: 8, outro_local: 1 },
        { sala_suap: 'BIBLIOTECA (Bloco A)', total: 5, correto: 5, outro_local: 0 }
      ]
    });

    await ctx.carregarTotaisSUAP(vi.fn());

    expect(ctx.suapTotais['ALMOXARIFADO (Bloco A)']).toBe(12);
    expect(ctx.suapEncontrados['ALMOXARIFADO (Bloco A)']).toBe(9);

    await ctx.carregarTotaisSUAP(vi.fn());
    expect(fetchTotais).toHaveBeenCalledTimes(1);
  });

  it('delegates progress screen opening to minhas salas flow', () => {
    ctx.showProgress();
    expect(ctx.showMinhasSalas).toHaveBeenCalled();
  });
});
