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
});
