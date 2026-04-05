import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const allowLegacyLogin = (Deno.env.get('ALLOW_SIAPE_ONLY_LOGIN') || '').toLowerCase() === 'true';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });

  try {
    const { siape, pin } = await req.json();
    const normalizedSiape = String(siape || '').trim().replace(/^0+/, '');
    const normalizedPin = String(pin || '').trim();

    if (!normalizedSiape || normalizedSiape.length < 4) {
      return json({ ok: false, erro: 'Credenciais invalidas' }, 400);
    }

    const { data: funcionario, error } = await supabase
      .from('funcionarios')
      .select('siape,nome,admin,ativo,pin')
      .eq('siape', normalizedSiape)
      .eq('ativo', true)
      .maybeSingle();

    if (error || !funcionario) {
      return json({ ok: false, erro: 'Credenciais invalidas' }, 401);
    }

    const savedPin = funcionario.pin ? String(funcionario.pin).trim() : '';
    if (savedPin) {
      if (!/^\d{4,6}$/.test(normalizedPin) || normalizedPin !== savedPin) {
        return json({ ok: false, erro: 'Credenciais invalidas' }, 401);
      }
      return json({
        ok: true,
        nome: funcionario.nome,
        siape: funcionario.siape,
        admin: !!funcionario.admin,
        scans: []
      });
    }

    if (!allowLegacyLogin) {
      return json({ ok: false, erro: 'PIN ainda nao configurado para este SIAPE' }, 403);
    }

    return json({
      ok: true,
      nome: funcionario.nome,
      siape: funcionario.siape,
      admin: !!funcionario.admin,
      scans: [],
      weakAuth: true
    });
  } catch (_err) {
    return json({ ok: false, erro: 'Requisicao invalida' }, 400);
  }
});

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors(), 'Content-Type': 'application/json' }
  });
}
