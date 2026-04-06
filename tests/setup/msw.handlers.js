import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://veazrwcnfamwjnaybpkd.supabase.co';

export const handlers = [
  http.get(`${SUPABASE_URL}/rest/v1/funcionarios`, ({ request }) => {
    const url = new URL(request.url);
    const siape = (url.searchParams.get('siape') || '').replace('eq.', '');
    if (siape === '2394174') {
      return HttpResponse.json([{ siape: '2394174', nome: 'Leonardo Alexandre', admin: true }]);
    }
    return HttpResponse.json([]);
  }),

  http.get(`${SUPABASE_URL}/rest/v1/patrimonios`, ({ request }) => {
    const url = new URL(request.url);
    const numeroEq = url.searchParams.get('numero');
    const numeroLike = url.searchParams.get('numero') || '';
    const rows = [
      {
        id: 1,
        numero: '86889',
        descricao: 'Estante aco 18 prateleiras',
        sala_suap: 'ALMOXARIFADO (Bloco A)',
        status: '',
        local_encontrado: null,
        encontrado_por: null,
        encontrado_em: null
      },
      {
        id: 2,
        numero: '86890',
        descricao: 'Notebook Dell',
        sala_suap: 'BIBLIOTECA (Bloco A)',
        status: 'Encontrado',
        local_encontrado: 'BIBLIOTECA (Bloco A)',
        encontrado_por: 'Leonardo Alexandre',
        encontrado_em: '2026-04-05T12:00:00.000Z'
      }
    ];

    if (numeroEq && numeroEq.startsWith('eq.')) {
      const target = numeroEq.replace('eq.', '');
      return HttpResponse.json(rows.filter((item) => item.numero === target));
    }

    if (numeroLike.includes('ilike.*868*')) {
      return HttpResponse.json(rows.filter((item) => item.numero.includes('868')));
    }

    return HttpResponse.json(rows);
  }),

  http.post(`${SUPABASE_URL}/functions/v1/auth-siape`, async ({ request }) => {
    const body = await request.json();
    if (body.siape === '2394174' && body.pin === '0246') {
      return HttpResponse.json({
        ok: true,
        nome: 'Leonardo Alexandre',
        siape: '2394174',
        admin: true,
        scans: []
      });
    }
    return HttpResponse.json({ ok: false, erro: 'Credenciais invalidas' }, { status: 401 });
  })
];
