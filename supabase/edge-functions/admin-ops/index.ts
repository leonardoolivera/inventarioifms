// Supabase Edge Function — admin-ops
// Todas as operações privilegiadas passam por aqui.
// A service_role key e a Gemini key ficam APENAS neste servidor.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // nunca exposta ao cliente
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });

  try {
    const { action, siape, data } = await req.json();

    // ── Verifica se o solicitante é admin ──────────────────────
    if (!siape) return json({ ok: false, erro: 'SIAPE não informado' });
    const { data: func } = await supabase
      .from('funcionarios')
      .select('admin')
      .eq('siape', siape.replace(/^0+/, ''))
      .eq('ativo', true)
      .single();

    if (!func?.admin) return json({ ok: false, erro: 'Acesso negado' });

    // ── Ações disponíveis ──────────────────────────────────────

    if (action === 'listarFuncionarios') {
      const { data: rows } = await supabase
        .from('funcionarios')
        .select('siape,nome,admin,ativo')
        .order('nome');
      return json({ ok: true, funcionarios: rows });
    }

    if (action === 'addFuncionario') {
      const { siape: s, nome, admin: isAdmin } = data;
      if (!s || !nome) return json({ ok: false, erro: 'SIAPE e nome são obrigatórios' });
      const { error } = await supabase.from('funcionarios').upsert({
        siape: String(s).replace(/^0+/, ''),
        nome: String(nome).trim(),
        admin: !!isAdmin,
        ativo: true
      }, { onConflict: 'siape' });
      if (error) return json({ ok: false, erro: error.message });
      return json({ ok: true });
    }

    if (action === 'removeFuncionario') {
      const { siape: s } = data;
      const { error } = await supabase
        .from('funcionarios')
        .update({ ativo: false })
        .eq('siape', String(s).replace(/^0+/, ''));
      if (error) return json({ ok: false, erro: error.message });
      return json({ ok: true });
    }

    if (action === 'importarPatrimonios') {
      // data.rows = [{ numero, descricao, sala_suap, estado_suap }, ...]
      const rows = (data.rows || []).map((r: Record<string, string>) => ({
        numero:      String(r.numero || '').trim().replace(/\.0$/, ''),
        descricao:   String(r.descricao || '').trim().substring(0, 200),
        sala_suap:   String(r.sala_suap || '').trim(),
        estado_suap: String(r.estado_suap || '').trim(),
        status:      '',
        local_encontrado: '',
        encontrado_por:   '',
      })).filter((r: { numero: string }) => r.numero);

      if (!rows.length) return json({ ok: false, erro: 'Nenhuma linha válida encontrada' });

      // Upsert em lotes de 500
      const LOTE = 500;
      let total = 0;
      for (let i = 0; i < rows.length; i += LOTE) {
        const lote = rows.slice(i, i + LOTE);
        const { error } = await supabase
          .from('patrimonios')
          .upsert(lote, { onConflict: 'numero', ignoreDuplicates: false });
        if (error) return json({ ok: false, erro: error.message, importados: total });
        total += lote.length;
      }
      return json({ ok: true, importados: total });
    }

    if (action === 'resetarInventario') {
      // Limpa scans, sem_patrimonio, log e reseta status dos patrimônios
      await supabase.from('scans').delete().neq('id', '');
      await supabase.from('sem_patrimonio').delete().neq('id', '');
      await supabase.from('log_operacoes').delete().neq('id', -1);
      await supabase.from('patrimonios').update({
        status: '', local_encontrado: '', encontrado_por: '', encontrado_em: null
      }).neq('id', -1);
      return json({ ok: true });
    }

    return json({ ok: false, erro: 'Ação desconhecida: ' + action });

  } catch (e) {
    return json({ ok: false, erro: String(e) });
  }
});

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

const json = (obj: unknown) =>
  new Response(JSON.stringify(obj), {
    headers: { ...cors(), 'Content-Type': 'application/json' }
  });
