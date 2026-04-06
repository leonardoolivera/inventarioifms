import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('busca helpers', () => {
  let elements;
  let ctx;

  beforeEach(() => {
    elements = new Map([
      ['buscaResult', { innerHTML: '' }],
      ['buscaSub', { textContent: '' }],
      ['scannerSearchResults', { innerHTML: '' }],
      ['scannerSearchHint', { textContent: '' }],
      ['scannerSearchPanel', { classList: { add: vi.fn(), remove: vi.fn() } }]
    ]);

    ctx = runLegacyScript('js/features/busca.js', {
      state: {
        isOnline: true,
        scans: [
          { type: 'scan', code: '86889', room: 'ALMOXARIFADO (Bloco A)', funcionario: 'Leonardo Alexandre', ts: '2026-04-05T12:00:00.000Z' }
        ]
      },
      buscarPatrimonio: vi.fn(async () => ({
        ok: true,
        resultados: [
          {
            numero: '86890',
            descricao: 'Notebook',
            sala: 'BIBLIOTECA (Bloco A)',
            status: '✅ Encontrado',
            quem: 'Maria Gestora',
            data: '2026-04-05 12:05'
          }
        ]
      })),
      fmtTime: () => '12:00',
      esc: (value) => String(value || ''),
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      }
    });
  });

  it('shows minimum length message for short queries', () => {
    ctx.buscarPatrimonioUI('86');

    expect(elements.get('buscaResult').innerHTML).toContain('Digite pelo menos 3 digitos');
    expect(elements.get('buscaSub').textContent).toBe('Digite o numero');
  });

  it('renders local results before remote search', async () => {
    await ctx.buscarPatrimonioUI('868');

    expect(elements.get('buscaSub').textContent).toContain('resultado');
    expect(elements.get('buscaResult').innerHTML).toContain('86890');
    expect(elements.get('buscaResult').innerHTML).toContain('Notebook');
  });

  it('opens scanner search panel when there is input', () => {
    ctx.handleScannerSearchInput('868');

    expect(elements.get('scannerSearchPanel').classList.add).toHaveBeenCalledWith('show');
  });
});
