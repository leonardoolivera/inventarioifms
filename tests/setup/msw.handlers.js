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
