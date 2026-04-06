import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('error flows integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps pending sync when a batch fails', async () => {
    const ctx = runLegacyScript('js/features/sync.js', {
      state: {
        pendingSync: ['scan-1'],
        isOnline: true,
        scans: [
          {
            id: 'scan-1',
            type: 'scan',
            code: '86889',
            room: 'ALMOXARIFADO (Bloco A)',
            ts: '2026-04-05T12:00:00.000Z',
            synced: false,
            funcionario: 'Leonardo Alexandre',
            siape: '2394174'
          }
        ]
      },
      photoCache: {},
      idbCarregarFoto: vi.fn().mockResolvedValue(null),
      idbDeletarFoto: vi.fn(),
      batchSync: vi.fn().mockResolvedValue({ ok: false, erro: 'Falha no lote' }),
      setSyncState: vi.fn(),
      sincronizarPlanilha: vi.fn(),
      renderHomeSummary: vi.fn()
    });
    ctx.renderHistList = vi.fn();

    const result = await ctx.syncNow();

    expect(result).toEqual({ ok: false, sincronizados: 0, falhas: 1 });
    expect(ctx.state.pendingSync).toEqual(['scan-1']);
    expect(ctx.state.scans[0].synced).toBe(false);
  });

  it('shows backend error when pin change is rejected', async () => {
    const elements = new Map([
      ['pinLabel', { style: {}, textContent: '' }],
      ['pinInput', { style: {}, value: '' }],
      ['siapeLoginHelp', { textContent: '' }],
      ['currentPinInput', { value: '9999' }],
      ['newPinInput', { value: '1357' }],
      ['confirmNewPinInput', { value: '1357' }],
      ['changePinBtn', { disabled: false, textContent: 'Alterar meu PIN' }],
      ['changePinStatus', { textContent: '' }]
    ]);

    const ctx = runLegacyScript('js/features/security.js', {
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

    ctx.alterarMeuPin();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(elements.get('changePinStatus').textContent).toBe('PIN atual invalido');
    expect(ctx.showToast).not.toHaveBeenCalled();
  });

  it('reports import failure without hiding preview', async () => {
    const elements = new Map([
      ['mapNumero', { value: 'numero', innerHTML: '' }],
      ['mapDescricao', { value: 'descricao', innerHTML: '' }],
      ['mapSala', { value: 'sala', innerHTML: '' }],
      ['mapEstado', { value: 'estado', innerHTML: '' }],
      ['importBtn', { disabled: false, textContent: 'Importar' }],
      ['importStatus', { textContent: '' }],
      ['importPreview', { style: { display: '' } }],
      ['importFileInput', { value: 'planilha.xlsx' }]
    ]);

    const ctx = runLegacyScript('js/features/admin.js', {
      currentUser: { siape: '2394174', nome: 'Leonardo Alexandre', admin: true },
      escHtml: (value) => String(value || ''),
      showToast: vi.fn(),
      adminOp: vi.fn(async () => ({ ok: false, erro: 'arquivo invalido' })),
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      }
    });

    ctx._adminPlanilhaRows = [
      { numero: '86889', descricao: 'Estante', sala: 'ALMOXARIFADO (Bloco A)', estado: 'Bom' }
    ];

    await ctx.adminImportar();

    expect(elements.get('importStatus').textContent).toContain('arquivo invalido');
    expect(elements.get('importPreview').style.display).toBe('');
    expect(ctx.showToast).toHaveBeenCalledWith('erro', 'Erro na importacao', 'arquivo invalido');
  });
});
