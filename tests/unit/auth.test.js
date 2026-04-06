import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('auth module', () => {
  let elements;
  let ctx;
  let timeouts;

  beforeEach(() => {
    localStorage.clear();
    timeouts = [];

    elements = new Map([
      ['loginWrap', { style: { display: 'none' } }],
      ['userAvatar', { textContent: '' }],
      ['userName', { textContent: '' }],
      ['userSiapeLabel', { textContent: '' }],
      ['userBadge', { style: { display: 'none' } }],
      ['adminBtn', { style: { display: 'none' } }],
      ['settingsAdminSection', { style: { display: 'none' } }],
      ['adminSub', { textContent: '' }],
      ['siapeInput', { value: '', focus: vi.fn() }],
      ['loginError', { textContent: '' }],
      ['loginBtn', { innerHTML: 'Entrar', disabled: false }],
      ['loginCardSiape', { style: { display: '' } }],
      ['loginCardAdmin', { style: { display: 'none' } }],
      ['adminEmailInput', { value: '', focus: vi.fn() }],
      ['adminSenhaInput', { value: '' }],
      ['loginErrorAdmin', { textContent: '' }],
      ['loginBtnAdmin', { innerHTML: 'Entrar', disabled: false }],
      ['resetSenhaModal', { style: { display: 'none' } }],
      ['novaSenhaInput', { value: '', focus: vi.fn() }],
      ['confirmarSenhaInput', { value: '' }],
      ['novaSenhaErro', { textContent: '' }],
      ['btnSalvarSenha', { textContent: 'Salvar senha', disabled: false }]
    ]);

    ctx = runLegacyScript('js/features/auth.js', {
      state: {
        rooms: ['ALMOXARIFADO (Bloco A)', 'BIBLIOTECA (Bloco A)'],
        hiddenRooms: [],
        pinnedRooms: [],
        pendingSync: [],
        scans: []
      },
      ROOMS_VERSION: 'suap-2026-v4',
      currentUser: null,
      getSalasSUAP: () => ['ALMOXARIFADO (Bloco A)', 'BIBLIOTECA (Bloco A)'],
      updateSyncBanner: vi.fn(),
      saveScans: vi.fn(),
      updateStats: vi.fn(),
      renderHistList: vi.fn(),
      showToast: vi.fn(),
      loginSiape: vi.fn(() => Promise.resolve({ ok: true, nome: 'Leonardo Alexandre', admin: false, scans: [{ id: 'srv-1' }] })),
      loginEmail: vi.fn(() => Promise.resolve({ ok: true, siape: '2394174', nome: 'Leonardo Alexandre' })),
      recuperarSenha: vi.fn(() => Promise.resolve({ ok: true })),
      trocarSenha: vi.fn(() => Promise.resolve({ ok: true })),
      confirm: vi.fn(() => true),
      prompt: vi.fn(() => 'gestor@ifms.edu.br'),
      location: { hash: '', pathname: '/inventarioifms/index.html' },
      history: {
        replaceState: vi.fn()
      },
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      },
      setTimeout: vi.fn((fn, ms) => {
        timeouts.push({ fn, ms });
        return timeouts.length;
      })
    });
  });

  it('shows login when there is no saved user', () => {
    ctx.iniciarApp();
    expect(elements.get('loginWrap').style.display).toBe('flex');
  });

  it('restores saved user and resets invalid hidden room state', () => {
    ctx.state.hiddenRooms = ['ALMOXARIFADO (Bloco A)', 'BIBLIOTECA (Bloco A)'];
    ctx.state.pinnedRooms = ['BIBLIOTECA (Bloco A)'];
    localStorage.setItem('currentUser', JSON.stringify({ siape: '2394174', nome: 'Leonardo Alexandre', admin: false }));

    ctx.aplicarUsuario = vi.fn();
    ctx.iniciarApp();

    expect(ctx.state.hiddenRooms).toEqual([]);
    expect(ctx.state.pinnedRooms).toEqual([]);
    expect(ctx.aplicarUsuario).toHaveBeenCalledWith(expect.objectContaining({ siape: '2394174' }));
  });

  it('applies user data and reveals admin affordances', () => {
    ctx.aplicarUsuario({ siape: '2394174', nome: 'Leonardo Alexandre', admin: true });

    expect(elements.get('userAvatar').textContent).toBe('LA');
    expect(elements.get('userName').textContent).toBe('Leonardo Alexandre');
    expect(elements.get('userSiapeLabel').textContent).toContain('2394174');
    expect(elements.get('userBadge').style.display).toBe('flex');
    expect(elements.get('adminBtn').style.display).toBe('block');
    expect(elements.get('settingsAdminSection').style.display).toBe('block');
  });

  it('logs in by siape and hydrates user session', async () => {
    elements.get('siapeInput').value = '2394174';

    ctx.fazerLogin();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.loginSiape).toHaveBeenCalledWith('2394174');
    expect(localStorage.getItem('currentUser')).toContain('2394174');
    expect(elements.get('loginWrap').style.display).toBe('none');
    expect(ctx.showToast).toHaveBeenCalled();
    expect(ctx.renderHistList).toHaveBeenCalled();
  });

  it('validates siape length before attempting login', () => {
    elements.get('siapeInput').value = '123';

    ctx.fazerLogin();

    expect(elements.get('loginError').textContent).toContain('SIAPE');
    expect(ctx.loginSiape).not.toHaveBeenCalled();
  });

  it('switches to admin login and authenticates admin account', async () => {
    ctx.mostrarLoginAdmin();
    elements.get('adminEmailInput').value = 'gestor@ifms.edu.br';
    elements.get('adminSenhaInput').value = '123456';

    ctx.fazerLoginAdmin();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(elements.get('loginCardSiape').style.display).toBe('none');
    expect(ctx.loginEmail).toHaveBeenCalledWith('gestor@ifms.edu.br', '123456');
    expect(elements.get('adminBtn').style.display).toBe('block');
  });

  it('returns to siape login and validates admin credentials presence', () => {
    ctx.mostrarLoginAdmin();
    ctx.mostrarLoginSiape();
    ctx.fazerLoginAdmin();

    expect(elements.get('loginCardAdmin').style.display).toBe('none');
    expect(elements.get('loginCardSiape').style.display).toBe('');
    expect(elements.get('loginErrorAdmin').textContent).toContain('Preencha email e senha');
  });

  it('sends recovery email when requested from admin login', async () => {
    elements.get('adminEmailInput').value = 'gestor@ifms.edu.br';

    ctx.abrirRecuperarSenha();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.recuperarSenha).toHaveBeenCalledWith('gestor@ifms.edu.br');
    expect(ctx.showToast).toHaveBeenCalledWith('ok', 'Email enviado!', expect.any(String));
  });

  it('opens recovery modal and saves a new password', async () => {
    ctx.location.hash = '#type=recovery&access_token=abc123';

    ctx.verificarResetSenha();
    expect(elements.get('resetSenhaModal').style.display).toBe('flex');

    elements.get('novaSenhaInput').value = '123456';
    elements.get('confirmarSenhaInput').value = '123456';
    ctx.salvarNovaSenha();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.trocarSenha).toHaveBeenCalledWith('123456', 'abc123');
    expect(elements.get('resetSenhaModal').style.display).toBe('none');
    expect(elements.get('loginWrap').style.display).toBe('flex');
  });

  it('validates password reset form branches', () => {
    elements.get('novaSenhaInput').value = '123';
    elements.get('confirmarSenhaInput').value = '123';
    ctx.salvarNovaSenha();
    expect(elements.get('novaSenhaErro').textContent).toContain('pelo menos 6');

    elements.get('novaSenhaInput').value = '123456';
    elements.get('confirmarSenhaInput').value = '654321';
    ctx.salvarNovaSenha();
    expect(elements.get('novaSenhaErro').textContent).toContain('coincidem');
  });

  it('logs out after confirmation and focuses siape input', () => {
    localStorage.setItem('currentUser', JSON.stringify({ siape: '2394174' }));
    ctx.currentUser = { siape: '2394174', nome: 'Leonardo Alexandre' };
    ctx.state.pendingSync = [{ id: 1 }];

    ctx.fazerLogout();

    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(elements.get('loginWrap').style.display).toBe('flex');
    expect(timeouts[0].ms).toBe(300);
    timeouts[0].fn();
    expect(elements.get('siapeInput').focus).toHaveBeenCalled();
  });

  it('merges scanned history without duplicating ids', () => {
    ctx.state.scans = [{ id: 'a-1', type: 'scan' }];

    ctx.carregarHistoricoServidor([
      { id: 'a-1', type: 'scan' },
      { id: 'a-2', type: 'scan' }
    ]);

    expect(ctx.state.scans).toHaveLength(2);
    expect(ctx.saveScans).toHaveBeenCalled();
    expect(ctx.updateStats).toHaveBeenCalled();
    expect(ctx.renderHistList).toHaveBeenCalled();
  });

  it('does not rewrite history when server scans are all duplicated', () => {
    ctx.state.scans = [{ id: 'a-1', type: 'scan' }];

    ctx.carregarHistoricoServidor([{ id: 'a-1', type: 'scan' }]);

    expect(ctx.saveScans).not.toHaveBeenCalled();
    expect(ctx.updateStats).not.toHaveBeenCalled();
  });
});
