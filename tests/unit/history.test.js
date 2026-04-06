import { beforeEach, describe, expect, it } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('history helpers', () => {
  let elements;
  let ctx;

  beforeEach(() => {
    elements = new Map([
      ['histList', { innerHTML: '' }],
      ['histSub', { textContent: '' }]
    ]);

    ctx = runLegacyScript('js/features/history.js', {
      state: {
        scans: [
          { type: 'scan', code: '86889', room: 'ALMOXARIFADO (Bloco A)', ts: '2026-04-05T12:00:00.000Z', synced: true },
          { type: 'nopat', desc: 'Monitor', room: 'BIBLIOTECA (Bloco A)', estado: 'Bom', ts: '2026-04-05T12:05:00.000Z', synced: false }
        ]
      },
      esc: (value) => String(value || ''),
      fmtTime: () => '12:00',
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      }
    });
  });

  it('renders empty state when there are no scans', () => {
    ctx.state.scans = [];
    ctx.renderHistList();

    expect(elements.get('histList').innerHTML).toContain('Nenhum scan ainda');
    expect(elements.get('histSub').textContent).toBe('0 registros');
  });

  it('renders summary cards and mixed records', () => {
    ctx.renderHistList();

    expect(elements.get('histSub').textContent).toBe('2 registros');
    expect(elements.get('histList').innerHTML).toContain('Registros');
    expect(elements.get('histList').innerHTML).toContain('Patrimonios');
    expect(elements.get('histList').innerHTML).toContain('Sem patrimonio');
    expect(elements.get('histList').innerHTML).toContain('Cod. 86889');
    expect(elements.get('histList').innerHTML).toContain('Monitor');
  });
});
