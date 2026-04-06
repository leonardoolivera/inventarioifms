import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('dashboard helpers', () => {
  let elements;
  let ctx;

  beforeEach(() => {
    elements = new Map([
      ['dbKpiEnc', { textContent: '' }],
      ['dbKpiEncSub', { textContent: '' }],
      ['dbKpiPct', { textContent: '' }],
      ['dbKpiSrv', { textContent: '' }],
      ['dbKpiDup', { textContent: '', style: {} }],
      ['dbHeroPct', { textContent: '' }],
      ['dbHeroPend', { textContent: '' }],
      ['dbGenBar', { style: {} }],
      ['dbBarLeft', { textContent: '' }],
      ['dbBarPct', { textContent: '' }],
      ['dbBarRight', { textContent: '' }],
      ['dbBlocos', { innerHTML: '' }],
      ['dbFaltam', { textContent: '' }],
      ['dbRitmo', { textContent: '' }],
      ['dbEstVal', { textContent: '' }],
      ['dbEstUnit', { textContent: '' }],
      ['dbAlertas', { innerHTML: '' }],
      ['dbFeed', { innerHTML: '' }]
    ]);

    ctx = runLegacyScript('js/features/dashboard.js', {
      escHtml: (value) => String(value || ''),
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      }
    });

    ctx._dbPats = [
      { numero: '86889', sala_suap: 'ALMOXARIFADO (Bloco A)', status: 'âœ… Encontrado' },
      { numero: '86890', sala_suap: 'BIBLIOTECA (Bloco A)', status: 'ðŸŸ¡ Outro local' },
      { numero: '86891', sala_suap: 'BIBLIOTECA (Bloco A)', status: 'ðŸ”´ DUPLICADO' }
    ];
    ctx._dbInv = [
      { codigo: '86889', sala: 'ALMOXARIFADO (Bloco A)', funcionario: 'Leonardo Alexandre', criado_em: '2026-04-05T12:00:00.000Z' },
      { codigo: '86890', sala: 'BIBLIOTECA (Bloco A)', funcionario: 'Maria Gestora', criado_em: '2026-04-05T12:05:00.000Z' }
    ];
  });

  it('maps rooms to known blocks', () => {
    expect(ctx.dbGetBloco('LAB 1 (BLOCO B)')).toBe('Bloco B');
    expect(ctx.dbGetBloco('PATIO')).toBe('Área Externa');
  });

  it('calculates rounded median for even-sized arrays', () => {
    expect(ctx.dbMediana([10, 30, 20, 40])).toBe(25);
  });

  it('renders dashboard counters and feed', () => {
    ctx.dbRenderTudo();

    expect(elements.get('dbKpiEnc').textContent).toBe('2');
    expect(elements.get('dbBarPct').textContent).toContain('%');
    expect(Number(elements.get('dbKpiDup').textContent)).toBeGreaterThanOrEqual(0);
    expect(elements.get('dbAlertas').innerHTML.length).toBeGreaterThan(0);
    expect(elements.get('dbFeed').innerHTML).toContain('Leonardo Alexandre');
  });
});
