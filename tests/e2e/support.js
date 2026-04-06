import { expect } from '@playwright/test';

const defaultUser = {
  siape: '2394174',
  nome: 'Leonardo Alexandre',
  admin: true
};

export async function mockSupabase(page) {
  await page.route('https://veazrwcnfamwjnaybpkd.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname.endsWith('/functions/v1/auth-siape')) {
      const body = request.postDataJSON() || {};
      if (body.siape === defaultUser.siape && body.pin === '0246') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            nome: defaultUser.nome,
            siape: defaultUser.siape,
            admin: defaultUser.admin,
            scans: []
          })
        });
        return;
      }

      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, erro: 'Credenciais invalidas' })
      });
      return;
    }

    if (pathname.endsWith('/functions/v1/change-pin')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true })
      });
      return;
    }

    if (pathname.endsWith('/functions/v1/inventario-sync')) {
      const body = request.postDataJSON() || { items: [] };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, sincronizados: (body.items || []).length })
      });
      return;
    }

    if (pathname.endsWith('/functions/v1/admin-ops')) {
      const body = request.postDataJSON() || {};
      if (body.action === 'listarFuncionarios') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            funcionarios: [
              { siape: '2394174', nome: 'Leonardo Alexandre', admin: true, ativo: true },
              { siape: '1234567', nome: 'Maria Gestora', admin: false, ativo: true }
            ]
          })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, rows: [] })
      });
      return;
    }

    if (pathname.endsWith('/rest/v1/funcionarios')) {
      const siape = (url.searchParams.get('siape') || '').replace('eq.', '');
      const rows = siape
        ? (siape === defaultUser.siape ? [defaultUser] : [])
        : [{ id: 1 }];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rows)
      });
      return;
    }

    if (pathname.endsWith('/rest/v1/patrimonios')) {
      const numeroEq = url.searchParams.get('numero') || '';
      const payload = [
        {
          numero: '86889',
          descricao: 'Estante aco 18 prateleiras',
          sala_suap: 'ALMOXARIFADO (Bloco A)',
          status: '',
          local_encontrado: null,
          encontrado_por: null,
          encontrado_em: null
        }
      ];

      if (numeroEq.includes('99999')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload)
      });
      return;
    }

    if (pathname.endsWith('/rest/v1/scans')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            codigo: '86889',
            sala: 'ALMOXARIFADO (Bloco A)',
            funcionario: 'Leonardo Alexandre',
            siape: '2394174',
            criado_em: '2026-04-05T12:00:00.000Z'
          },
          {
            codigo: '86890',
            sala: 'BIBLIOTECA (Bloco A)',
            funcionario: 'Maria Gestora',
            siape: '1234567',
            criado_em: '2026-04-05T12:10:00.000Z'
          }
        ])
      });
      return;
    }

    if (pathname.endsWith('/rest/v1/vw_progresso_por_sala')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { sala_suap: 'ALMOXARIFADO (Bloco A)', total: 12, correto: 3, outro_local: 0 },
          { sala_suap: 'BIBLIOTECA (Bloco A)', total: 7, correto: 1, outro_local: 0 }
        ])
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });
}

export async function mockDeviceApis(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true
    });

    navigator.vibrate = () => {};

    if (!navigator.mediaDevices) navigator.mediaDevices = {};
    navigator.mediaDevices.getUserMedia = async () => {
      const error = new Error('Requested device not found');
      error.name = 'NotFoundError';
      throw error;
    };
  });
}

export async function seedSession(page, options = {}) {
  const user = options.user || defaultUser;
  const room = options.room || 'ALMOXARIFADO (Bloco A)';
  const scans = options.scans || [];
  const pendingSync = options.pendingSync || [];

  await page.addInitScript(
    ({ storedUser, storedRoom, storedScans, storedPendingSync }) => {
      localStorage.setItem('currentUser', JSON.stringify(storedUser));
      localStorage.setItem('currentUserSavedAt', String(Date.now()));
      localStorage.setItem('currentRoom', storedRoom);
      localStorage.setItem('scans', JSON.stringify(storedScans));
      localStorage.setItem('pendingSync', JSON.stringify(storedPendingSync));
    },
    {
      storedUser: user,
      storedRoom: room,
      storedScans: scans,
      storedPendingSync: pendingSync
    }
  );
}

export async function gotoApp(page) {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
}
