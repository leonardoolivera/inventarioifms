import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('admin ui helpers', () => {
  let elements;
  let ctx;

  beforeEach(() => {
    elements = new Map([
      ['tabFunc', { classList: { toggle: vi.fn() } }],
      ['tabImport', { classList: { toggle: vi.fn() } }],
      ['tabReset', { classList: { toggle: vi.fn() } }],
      ['adminPanelFunc', { style: { display: 'none' } }],
      ['adminPanelImport', { style: { display: 'none' } }],
      ['adminPanelReset', { style: { display: 'none' } }],
      ['funcList', { innerHTML: '' }],
      ['addFuncForm', { style: { display: 'none' } }],
      ['addFuncNome', { value: '', focus: vi.fn() }],
      ['addFuncSiape', { value: '', focus: vi.fn() }],
      ['addFuncAdmin', { checked: false }],
      ['importStatus', { textContent: '' }],
      ['importPreview', { style: { display: 'none' } }],
      ['mapNumero', { innerHTML: '', value: '' }],
      ['mapDescricao', { innerHTML: '', value: '' }],
      ['mapSala', { innerHTML: '', value: '' }],
      ['mapEstado', { innerHTML: '', value: '' }],
      ['importTable', { innerHTML: '' }],
      ['importInfo', { textContent: '' }],
      ['importBtn', { disabled: false, textContent: 'Importar' }],
      ['importFileInput', { value: '' }],
      ['btnResetar', { disabled: false, textContent: 'Resetar Inventario' }],
      ['resetStatus', { textContent: '' }]
    ]);

    ctx = runLegacyScript('js/features/admin.js', {
      currentUser: { siape: '2394174', nome: 'Leonardo Alexandre', admin: true },
      escHtml: (value) => String(value || ''),
      showToast: vi.fn(),
      confirm: vi.fn(() => true),
      prompt: vi.fn(() => 'CONFIRMAR'),
      adminOp: vi.fn((action, siape, payload) => {
        if (action === 'listarFuncionarios') return Promise.resolve({ ok: true, funcionarios: [] });
        if (action === 'addFuncionario') return Promise.resolve({ ok: true, payload });
        if (action === 'importarPatrimonios') return Promise.resolve({ ok: true, importados: payload.rows.length });
        if (action === 'resetarInventario') return Promise.resolve({ ok: true });
        return Promise.resolve({ ok: true });
      }),
      XLSX: {
        read: vi.fn(() => ({ SheetNames: ['Aba1'], Sheets: { Aba1: {} } })),
        utils: {
          sheet_to_json: vi.fn(() => [
            { Numero: '1001', Descricao: 'Notebook', Sala: 'BIBLIOTECA', Estado: 'Bom' },
            { Numero: '1002', Descricao: 'Monitor', Sala: 'ALMOXARIFADO', Estado: 'Regular' }
          ])
        }
      },
      FileReader: function() {
        this.readAsArrayBuffer = () => {
          this.onload({ target: { result: new ArrayBuffer(8) } });
        };
      },
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      }
    });
  });

  it('switches admin tabs and loads employee pane', () => {
    ctx.adminCarregarFunc = vi.fn();

    ctx.adminTab('func');

    expect(elements.get('adminPanelFunc').style.display).toBe('');
    expect(elements.get('adminPanelImport').style.display).toBe('none');
    expect(ctx.adminCarregarFunc).toHaveBeenCalled();
  });

  it('validates and saves employee form', async () => {
    elements.get('addFuncNome').value = 'Maria Gestora';
    elements.get('addFuncSiape').value = '001234567';
    elements.get('addFuncAdmin').checked = true;
    ctx.adminCarregarFunc = vi.fn();

    ctx.adminSalvarFunc();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.adminOp).toHaveBeenCalledWith(
      'addFuncionario',
      '2394174',
      expect.objectContaining({ siape: '1234567', nome: 'Maria Gestora', admin: true })
    );
    expect(ctx.showToast).toHaveBeenCalledWith('ok', 'Funcionario salvo!', expect.stringContaining('1234567'));
  });

  it('reads spreadsheet, guesses mappings and imports rows', async () => {
    ctx.adminLerPlanilha({ files: [{}] });

    expect(elements.get('importPreview').style.display).toBe('');
    expect(elements.get('mapNumero').value).toBe('Numero');
    expect(elements.get('mapDescricao').value).toBe('Descricao');
    expect(elements.get('mapSala').value).toBe('Sala');
    expect(elements.get('mapEstado').value).toBe('Estado');

    ctx.adminImportar();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.adminOp).toHaveBeenCalledWith(
      'importarPatrimonios',
      '2394174',
      expect.objectContaining({
        rows: expect.arrayContaining([
          expect.objectContaining({ numero: '1001', descricao: 'Notebook', sala_suap: 'BIBLIOTECA' })
        ])
      })
    );
    expect(elements.get('importStatus').textContent).toContain('importados');
  });

  it('resets inventory after explicit confirmation', async () => {
    ctx.adminResetar();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.adminOp).toHaveBeenCalledWith('resetarInventario', '2394174');
    expect(elements.get('resetStatus').textContent).toContain('Resetado');
  });
});
