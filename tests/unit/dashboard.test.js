import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('dashboard helpers', () => {
  let elements;
  let intervals;
  let ctx;

  beforeEach(() => {
    intervals = [];
    elements = new Map([
      ['dbLiveBadge', { textContent: '', className: '' }],
      ['dbLastUpdate', { textContent: '' }],
      ['scDashboard', { classList: { contains: vi.fn(() => false) } }],
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
      sbFetchAll: vi.fn((path) => {
        if (path.includes('patrimonios')) {
          return Promise.resolve([
            { numero: '86889', sala_suap: 'ALMOXARIFADO (BLOCO A)', status: 'âœ… Encontrado' },
            { numero: '86890', sala_suap: 'BIBLIOTECA (BLOCO A)', status: 'ðŸŸ¡ Outro local' },
            { numero: '86891', sala_suap: 'PATIO', status: 'ðŸ”´ DUPLICADO' }
          ]);
        }
        return Promise.resolve([
          { codigo: '86889', sala: 'ALMOXARIFADO (Bloco A)', funcionario: 'Leonardo Alexandre', criado_em: '2026-04-05T12:00:00.000Z' },
          { codigo: '86890', sala: 'BIBLIOTECA (Bloco A)', funcionario: 'Maria Gestora', criado_em: '2026-04-05T12:05:00.000Z' }
        ]);
      }),
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      },
      setInterval: vi.fn((fn, ms) => {
        intervals.push({ fn, ms });
        return intervals.length;
      }),
      clearInterval: vi.fn()
    });

    ctx._dbPats = [
      { numero: '86889', sala_suap: 'ALMOXARIFADO (BLOCO A)', status: 'âœ… Encontrado' },
      { numero: '86890', sala_suap: 'BIBLIOTECA (BLOCO A)', status: 'ðŸŸ¡ Outro local' },
      { numero: '86891', sala_suap: 'PATIO', status: 'ðŸ”´ DUPLICADO' }
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

  it('loads dashboard data and updates live badge state', async () => {
    ctx.carregarDashboard();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.sbFetchAll).toHaveBeenCalledTimes(2);
    expect(elements.get('dbLiveBadge').textContent).toContain('ao vivo');
    expect(elements.get('dbLastUpdate').textContent).toContain('Atualizado');
    expect(intervals.some((item) => item.ms === 30000)).toBe(true);
  });

  it('shows graceful empty state when there are no scans', () => {
    ctx._dbPats = [];
    ctx._dbInv = [];

    ctx.dbRenderTudo();

    expect(elements.get('dbFeed').innerHTML).toContain('Sem scans recentes');
    expect(elements.get('dbBlocos').innerHTML).toContain('Sem dados');
  });
});
