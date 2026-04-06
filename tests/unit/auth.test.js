import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('auth module', () => {
  let elements;
  let ctx;

  beforeEach(() => {
    localStorage.clear();

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
      ['loginError', { textContent: '' }]
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
      loginSiape: vi.fn(),
      loginEmail: vi.fn(),
      recuperarSenha: vi.fn(),
      trocarSenha: vi.fn(),
      confirm: vi.fn(() => true),
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      }
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
