import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });

  try {
    const { siape, currentPin, newPin } = await req.json();
    const normalizedSiape = String(siape || '').trim().replace(/^0+/, '');
    const oldPin = String(currentPin || '').trim();
    const nextPin = String(newPin || '').trim();

    if (!normalizedSiape || !/^\d{4,6}$/.test(oldPin) || !/^\d{4,6}$/.test(nextPin)) {
      return json({ ok: false, erro: 'Dados invalidos' }, 400);
    }

    const { data: funcionario, error } = await supabase
      .from('funcionarios')
      .select('siape,pin,ativo')
      .eq('siape', normalizedSiape)
      .eq('ativo', true)
      .maybeSingle();

    if (error || !funcionario) {
      return json({ ok: false, erro: 'Credenciais invalidas' }, 401);
    }

    const savedPin = funcionario.pin ? String(funcionario.pin).trim() : '';
    if (!savedPin || savedPin !== oldPin) {
      return json({ ok: false, erro: 'PIN atual incorreto' }, 401);
    }

    const { error: updateError } = await supabase
      .from('funcionarios')
      .update({ pin: nextPin })
      .eq('siape', normalizedSiape);

    if (updateError) {
      return json({ ok: false, erro: updateError.message }, 500);
    }

    return json({ ok: true });
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
