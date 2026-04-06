import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });

  try {
    const { action, siape, data } = await req.json();

    if (!siape) return json({ ok: false, erro: 'SIAPE nao informado' });

    const { data: func } = await supabase
      .from('funcionarios')
      .select('admin')
      .eq('siape', String(siape).replace(/^0+/, ''))
      .eq('ativo', true)
      .single();

    if (!func?.admin) return json({ ok: false, erro: 'Acesso negado' });

    if (action === 'listarFuncionarios') {
      const { data: rows } = await supabase
        .from('funcionarios')
        .select('siape,nome,admin,ativo,email')
        .order('nome');
      return json({ ok: true, funcionarios: rows || [] });
    }

    if (action === 'addFuncionario') {
      const { siape: incomingSiape, nome, admin: isAdmin, pin, email } = data || {};
      if (!incomingSiape || !nome) {
        return json({ ok: false, erro: 'SIAPE e nome sao obrigatorios' });
      }

      const pinValue = pin == null || String(pin).trim() === '' ? '0246' : String(pin).trim();
      if (!/^\d{4,6}$/.test(pinValue)) {
        return json({ ok: false, erro: 'PIN deve ter de 4 a 6 numeros' });
      }

      const payload = {
        siape: String(incomingSiape).replace(/^0+/, ''),
        nome: String(nome).trim(),
        admin: !!isAdmin,
        ativo: true,
        pin: pinValue,
        email: email ? String(email).trim().toLowerCase() : null
      };

      const { error } = await supabase
        .from('funcionarios')
        .upsert(payload, { onConflict: 'siape' });

      if (error) return json({ ok: false, erro: error.message });
      return json({ ok: true });
    }

    if (action === 'removeFuncionario') {
      const { siape: incomingSiape } = data || {};
      const { error } = await supabase
        .from('funcionarios')
        .update({ ativo: false })
        .eq('siape', String(incomingSiape || '').replace(/^0+/, ''));
      if (error) return json({ ok: false, erro: error.message });
      return json({ ok: true });
    }

    if (action === 'resetPinFuncionario') {
      const { siape: incomingSiape } = data || {};
      if (!incomingSiape) {
        return json({ ok: false, erro: 'SIAPE nao informado para resetar o PIN' });
      }
      const { error } = await supabase
        .from('funcionarios')
        .update({ pin: '0246', ativo: true })
        .eq('siape', String(incomingSiape).replace(/^0+/, ''));
      if (error) return json({ ok: false, erro: error.message });
      return json({ ok: true });
    }

    if (action === 'importarPatrimonios') {
      const rows = (data?.rows || []).map((r: Record<string, string>) => ({
        numero: String(r.numero || '').trim().replace(/\.0$/, ''),
        descricao: String(r.descricao || '').trim().substring(0, 200),
        sala_suap: String(r.sala_suap || '').trim(),
        estado_suap: String(r.estado_suap || '').trim(),
        status: '',
        local_encontrado: '',
        encontrado_por: ''
      })).filter((r: { numero: string }) => r.numero);

      if (!rows.length) return json({ ok: false, erro: 'Nenhuma linha valida encontrada' });

      const lote = 500;
      let total = 0;
      for (let i = 0; i < rows.length; i += lote) {
        const atual = rows.slice(i, i + lote);
        const { error } = await supabase
          .from('patrimonios')
          .upsert(atual, { onConflict: 'numero', ignoreDuplicates: false });
        if (error) return json({ ok: false, erro: error.message, importados: total });
        total += atual.length;
      }
      return json({ ok: true, importados: total });
    }

    if (action === 'resetarInventario') {
      await supabase.from('scans').delete().neq('id', '');
      await supabase.from('sem_patrimonio').delete().neq('id', '');
      await supabase.from('log_operacoes').delete().neq('id', -1);
      await supabase.from('patrimonios').update({
        status: '',
        local_encontrado: '',
        encontrado_por: '',
        encontrado_em: null
      }).neq('id', -1);
      return json({ ok: true });
    }

    return json({ ok: false, erro: 'Acao desconhecida: ' + action });
  } catch (e) {
    return json({ ok: false, erro: String(e) });
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
