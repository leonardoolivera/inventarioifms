import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('change pin integration', () => {
  let elements;
  let ctx;

  beforeEach(() => {
    elements = new Map([
      ['pinLabel', { style: {}, textContent: '' }],
      ['pinInput', { style: {}, value: '' }],
      ['siapeLoginHelp', { textContent: '' }],
      ['currentPinInput', { value: '0246' }],
      ['newPinInput', { value: '1357' }],
      ['confirmNewPinInput', { value: '1357' }],
      ['changePinBtn', { disabled: false, textContent: 'Alterar meu PIN' }],
      ['changePinStatus', { textContent: '' }]
    ]);

    ctx = runLegacyScript('js/features/security.js', {
      SUPABASE_URL: 'https://veazrwcnfamwjnaybpkd.supabase.co',
      SUPABASE_ANON: 'sb_publishable__PGOsNopOsgVgHROJYlwvw_ZKi31B-8',
      currentUser: { siape: '2394174', nome: 'Leonardo Alexandre', admin: true },
      loginSiape: async () => ({ ok: false }),
      iniciarApp: () => {},
      adminSalvarFunc: () => {},
      adminFecharAddFunc: () => {},
      showToast: vi.fn(),
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      }
    });
  });

  it('changes pin successfully and clears form fields', async () => {
    ctx.alterarMeuPin();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(elements.get('changePinStatus').textContent).toBe('PIN alterado com sucesso.');
    expect(elements.get('changePinBtn').disabled).toBe(false);
    expect(elements.get('changePinBtn').textContent).toBe('Alterar meu PIN');
    expect(ctx.showToast).toHaveBeenCalledWith('ok', 'PIN atualizado', 'Seu acesso foi protegido com o novo PIN');
  });

  it('blocks invalid confirmation before calling backend', async () => {
    elements.get('confirmNewPinInput').value = '9999';

    await ctx.alterarMeuPin();

    expect(elements.get('changePinStatus').textContent).toBe('A confirmacao do novo PIN nao confere.');
    expect(ctx.showToast).not.toHaveBeenCalled();
  });
});
