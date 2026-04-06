import { beforeEach, describe, expect, it } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('home helpers', () => {
  let elements;
  let ctx;

  beforeEach(() => {
    elements = new Map([
      ['homeStatusBadge', { classList: { toggle() {} } }],
      ['homeStatusText', { textContent: '' }],
      ['homeRoomsDone', { textContent: '' }],
      ['homeRoomsTotal', { textContent: '' }],
      ['homeAssetsTotal', { textContent: '' }],
      ['homeProgressPct', { textContent: '' }],
      ['homeProgressFill', { style: {} }],
      ['homeProgressText', { textContent: '' }]
    ]);

    ctx = runLegacyScript('js/features/home.js', {
      state: {
        isOnline: true,
        rooms: ['ALMOXARIFADO (Bloco A)', 'BIBLIOTECA (Bloco A)'],
        scans: [
          { type: 'scan', room: 'ALMOXARIFADO (Bloco A)' },
          { type: 'scan', room: 'ALMOXARIFADO (Bloco A)' },
          { type: 'nopat', room: 'BIBLIOTECA (Bloco A)' }
        ]
      },
      suapTotais: {
        'ALMOXARIFADO (Bloco A)': 5,
        'BIBLIOTECA (Bloco A)': 3
      },
      suapEncontrados: {
        'ALMOXARIFADO (Bloco A)': 2,
        'BIBLIOTECA (Bloco A)': 1
      },
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      }
    });
  });

  it('computes summary using suap totals when available', () => {
    const summary = ctx.getHomeSummary();

    expect(summary.bensEscaneados).toBe(2);
    expect(summary.totalSalas).toBe(2);
    expect(summary.progresso).toBe(25);
  });

  it('renders summary cards and progress text', () => {
    ctx.renderHomeSummary();

    expect(elements.get('homeRoomsDone').textContent).toBe(0);
    expect(elements.get('homeRoomsTotal').textContent).toBe(2);
    expect(elements.get('homeAssetsTotal').textContent).toBe(2);
    expect(elements.get('homeProgressPct').textContent).toBe('25%');
    expect(elements.get('homeProgressText').textContent).toBe('25% concluido');
  });
});
