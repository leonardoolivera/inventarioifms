import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('admin integration', () => {
  let elements;
  let ctx;

  beforeEach(() => {
    elements = new Map([
      ['funcList', { innerHTML: '' }]
    ]);

    ctx = runLegacyScript('js/features/admin.js', {
      currentUser: { siape: '2394174', nome: 'Leonardo Alexandre', admin: true },
      escHtml: (value) => String(value || ''),
      showToast: vi.fn(),
      confirm: vi.fn(() => true),
      adminOp: vi.fn(async (action) => {
        if (action === 'listarFuncionarios') {
          return {
            ok: true,
            funcionarios: [
              { siape: '2394174', nome: 'Leonardo Alexandre', admin: true, ativo: true },
              { siape: '1234567', nome: 'Maria Gestora', admin: false, ativo: true }
            ]
          };
        }
        return { ok: true };
      }),
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      }
    });
  });

  it('renders employee list with reset pin action for other users', async () => {
    await ctx.adminCarregarFunc();

    const html = elements.get('funcList').innerHTML;
    expect(html).toContain('Leonardo Alexandre');
    expect(html).toContain('Maria Gestora');
    expect(html).toContain('Redefinir PIN');
    expect(html).toContain('Remover');
  });

  it('requests pin reset through admin operation', async () => {
    await ctx.adminResetarPinFunc('1234567', 'Maria Gestora');

    expect(ctx.adminOp).toHaveBeenCalledWith('resetPinFuncionario', '2394174', { siape: '1234567' });
    expect(ctx.showToast).toHaveBeenCalledWith('ok', 'PIN redefinido', expect.stringContaining('PIN temporario 0246'));
  });
});
