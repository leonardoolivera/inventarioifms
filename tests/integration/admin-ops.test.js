import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('admin import and reset integration', () => {
  let elements;
  let ctx;

  beforeEach(() => {
    elements = new Map([
      ['mapNumero', { value: 'numero', innerHTML: '' }],
      ['mapDescricao', { value: 'descricao', innerHTML: '' }],
      ['mapSala', { value: 'sala', innerHTML: '' }],
      ['mapEstado', { value: 'estado', innerHTML: '' }],
      ['importBtn', { disabled: false, textContent: 'Importar' }],
      ['importStatus', { textContent: '' }],
      ['importPreview', { style: { display: '' } }],
      ['importFileInput', { value: 'planilha.xlsx' }],
      ['btnResetar', { disabled: false, textContent: 'Resetar Inventario' }],
      ['resetStatus', { textContent: '' }]
    ]);

    ctx = runLegacyScript('js/features/admin.js', {
      currentUser: { siape: '2394174', nome: 'Leonardo Alexandre', admin: true },
      escHtml: (value) => String(value || ''),
      showToast: vi.fn(),
      prompt: vi.fn(() => 'CONFIRMAR'),
      adminOp: vi.fn(async (action, _siape, data) => {
        if (action === 'importarPatrimonios') {
          return { ok: true, importados: data.rows.length };
        }
        if (action === 'resetarInventario') {
          return { ok: true };
        }
        return { ok: true };
      }),
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      }
    });

    ctx._adminPlanilhaRows = [
      { numero: '86889', descricao: 'Estante', sala: 'ALMOXARIFADO (Bloco A)', estado: 'Bom' },
      { numero: '86890', descricao: 'Notebook', sala: 'BIBLIOTECA (Bloco A)', estado: 'Excelente' }
    ];
  });

  it('imports mapped rows through admin operation', async () => {
    await ctx.adminImportar();

    expect(ctx.adminOp).toHaveBeenCalledWith('importarPatrimonios', '2394174', {
      rows: [
        {
          numero: '86889',
          descricao: 'Estante',
          sala_suap: 'ALMOXARIFADO (Bloco A)',
          estado_suap: 'Bom'
        },
        {
          numero: '86890',
          descricao: 'Notebook',
          sala_suap: 'BIBLIOTECA (Bloco A)',
          estado_suap: 'Excelente'
        }
      ]
    });
    expect(elements.get('importStatus').textContent).toContain('2 patrimonios importados');
    expect(elements.get('importPreview').style.display).toBe('none');
    expect(ctx.showToast).toHaveBeenCalledWith('ok', '2 patrimonios importados!', '');
  });

  it('confirms and resets inventory through admin operation', async () => {
    await ctx.adminResetar();

    expect(ctx.adminOp).toHaveBeenCalledWith('resetarInventario', '2394174');
    expect(elements.get('resetStatus').textContent).toContain('Resetado');
    expect(ctx.showToast).toHaveBeenCalledWith('ok', 'Inventario resetado com sucesso!', 'Todos os scans foram apagados');
  });
});
