import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('security helpers', () => {
  let ctx;
  let elements;

  beforeEach(() => {
    localStorage.clear();
    elements = new Map([
      ['pinLabel', { style: {}, textContent: '' }],
      ['pinInput', { style: {}, value: '' }],
      ['siapeLoginHelp', { textContent: '' }],
      ['siapeInput', { value: '2394174' }],
      ['loginError', { textContent: '' }],
      ['loginBtn', { innerHTML: 'Entrar', disabled: false }],
      ['loginWrap', { style: { display: 'flex' } }],
      ['currentPinInput', { value: '' }],
      ['newPinInput', { value: '' }],
      ['confirmNewPinInput', { value: '' }],
      ['changePinBtn', { textContent: 'Alterar meu PIN', disabled: false }],
      ['changePinStatus', { textContent: '' }],
      ['addFuncNome', { value: '' }],
      ['addFuncSiape', { value: '' }],
      ['addFuncPin', { value: '' }],
      ['addFuncAdmin', { checked: false }]
    ]);

    ctx = runLegacyScript('js/features/security.js', {
      SUPABASE_URL: 'https://veazrwcnfamwjnaybpkd.supabase.co',
      SUPABASE_ANON: 'sb_publishable__PGOsNopOsgVgHROJYlwvw_ZKi31B-8',
      fetch: vi.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ ok: true, nome: 'Leonardo Alexandre', siape: '2394174', admin: false }))
      })),
      loginSiape: vi.fn(async () => ({ ok: true, nome: 'Fallback User' })),
      iniciarApp: vi.fn(),
      adminSalvarFunc: vi.fn(),
      adminFecharAddFunc: vi.fn(),
      currentUser: { siape: '2394174', nome: 'Leonardo Alexandre' },
      aplicarUsuario: vi.fn(),
      carregarHistoricoServidor: vi.fn(),
      showToast: vi.fn(),
      adminOp: vi.fn(() => Promise.resolve({ ok: true })),
      adminCarregarFunc: vi.fn(),
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      }
    });
  });

  it('blocks auth after configured max attempts', () => {
    for (let i = 0; i < ctx.AUTH_MAX_ATTEMPTS; i++) {
      ctx.registerAuthFailure('siape');
    }
    expect(ctx.canAttemptAuth('siape')).toBe(false);
  });

  it('expires stale stored session', () => {
    localStorage.setItem('currentUser', JSON.stringify({ siape: '2394174' }));
    localStorage.setItem('currentUserSavedAt', String(Date.now() - ctx.AUTH_SESSION_MAX_AGE_MS - 1000));

    ctx.expireStoredSessionIfNeeded();

    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(localStorage.getItem('currentUserSavedAt')).toBeNull();
  });

  it('updates login help text when PIN is required', () => {
    ctx.updateSecurityLoginUI();
    expect(elements.get('pinLabel').style.display).toBe('block');
    expect(elements.get('pinInput').style.display).toBe('block');
    expect(elements.get('siapeLoginHelp').textContent).toContain('SIAPE e PIN');
  });

  it('falls back to legacy login when pin is not required and function is unavailable', async () => {
    ctx.AUTH_REQUIRE_PIN = false;
    ctx.fetch = vi.fn(() => Promise.resolve({
      ok: false,
      status: 404,
      text: () => Promise.resolve('{}')
    }));

    const res = await ctx.secureLoginSiape('02394174', '');

    expect(ctx._legacyLoginSiape).toHaveBeenCalledWith('2394174');
    expect(res.ok).toBe(true);
  });

  it('saves session on successful secure login', async () => {
    elements.get('pinInput').value = '0246';

    ctx.fazerLogin();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(localStorage.getItem('currentUser')).toContain('2394174');
    expect(elements.get('loginWrap').style.display).toBe('none');
    expect(ctx.aplicarUsuario).toHaveBeenCalled();
  });

  it('rejects invalid pin format before contacting backend', () => {
    elements.get('pinInput').value = '12';

    ctx.fazerLogin();

    expect(elements.get('loginError').textContent).toContain('PIN de 4 a 6 numeros');
    expect(ctx.fetch).not.toHaveBeenCalled();
  });

  it('shows throttle warning after too many auth attempts', () => {
    elements.get('pinInput').value = '0246';
    for (let i = 0; i < ctx.AUTH_MAX_ATTEMPTS; i++) ctx.registerAuthFailure('siape');

    ctx.fazerLogin();

    expect(elements.get('loginError').textContent).toContain('Muitas tentativas');
    expect(ctx.fetch).not.toHaveBeenCalled();
  });

  it('validates funcionario form before saving', () => {
    elements.get('addFuncNome').value = 'Servidor Teste';
    elements.get('addFuncSiape').value = 'abc123';

    ctx.adminSalvarFunc();

    expect(ctx.adminOp).not.toHaveBeenCalled();
    expect(ctx.showToast).toHaveBeenCalledWith('warn', 'SIAPE deve conter apenas numeros', '');
  });

  it('validates and changes user pin successfully', async () => {
    elements.get('currentPinInput').value = '0246';
    elements.get('newPinInput').value = '1357';
    elements.get('confirmNewPinInput').value = '1357';
    ctx.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ ok: true }))
    }));

    ctx.alterarMeuPin();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/change-pin'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(elements.get('changePinStatus').textContent).toContain('sucesso');
    expect(ctx.showToast).toHaveBeenCalledWith('ok', 'PIN atualizado', expect.any(String));
  });

  it('blocks pin change when confirmation does not match', () => {
    elements.get('currentPinInput').value = '0246';
    elements.get('newPinInput').value = '1357';
    elements.get('confirmNewPinInput').value = '9753';

    ctx.alterarMeuPin();

    expect(elements.get('changePinStatus').textContent).toContain('nao confere');
    expect(ctx.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/functions/v1/change-pin'), expect.anything());
  });
});
