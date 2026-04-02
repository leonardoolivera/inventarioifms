import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type SyncItem = {
  id: string;
  type: 'scan' | 'nopat';
  code?: string;
  room?: string;
  desc?: string;
  estado?: string;
  photo?: string;
  foto_url?: string;
  ts?: string;
  funcionario?: string;
  siape?: string;
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

let bucketReady = false;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors() });
  }

  try {
    const { items } = await req.json();
    const rows: SyncItem[] = Array.isArray(items) ? items : [];
    if (!rows.length) return json({ ok: true, sincronizados: 0 });

    let sincronizados = 0;
    const erros: string[] = [];

    for (const item of rows) {
      try {
        if (item.type === 'scan') {
          await sincronizarScan(item);
        } else if (item.type === 'nopat') {
          await sincronizarSemPatrimonio(item);
        } else {
          throw new Error(`Tipo inválido: ${item.type}`);
        }
        sincronizados += 1;
      } catch (err) {
        erros.push(`${item.id || 'sem-id'}: ${String(err)}`);
      }
    }

    return json({
      ok: erros.length === 0,
      sincronizados,
      falhas: rows.length - sincronizados,
      erros,
    });
  } catch (err) {
    return json({ ok: false, erro: String(err) });
  }
});

async function sincronizarScan(item: SyncItem) {
  const codigo = normalizarNumero(item.code);
  if (!item.id || !codigo || !item.room) {
    throw new Error('Scan incompleto');
  }

  const { error: insertScanError } = await supabase
    .from('scans')
    .upsert({
      id: item.id,
      codigo,
      sala: String(item.room).trim(),
      funcionario: item.funcionario || null,
      siape: item.siape || null,
      criado_em: item.ts || new Date().toISOString(),
    }, { onConflict: 'id', ignoreDuplicates: false });

  if (insertScanError) throw insertScanError;

  const { data: patrimonio, error: fetchPatError } = await supabase
    .from('patrimonios')
    .select('id,sala_suap,status,local_encontrado,encontrado_por')
    .eq('numero', codigo)
    .maybeSingle();

  if (fetchPatError) throw fetchPatError;
  if (!patrimonio) return;

  const salaAtual = String(item.room).trim();
  const jaMarcado = !!(patrimonio.status && String(patrimonio.status).trim());
  const registro = [item.funcionario || '', item.siape ? `(${item.siape})` : '']
    .join(' ')
    .trim();

  let novoStatus = '✅ Encontrado';
  let novoLocal = salaAtual;
  let novoEncontradoPor = registro;

  if (jaMarcado) {
    novoStatus = '🔴 DUPLICADO';
    novoLocal = [patrimonio.local_encontrado || patrimonio.sala_suap || '', salaAtual]
      .filter(Boolean)
      .join(' → ');
    novoEncontradoPor = [patrimonio.encontrado_por || '', registro].filter(Boolean).join(' | ');
  } else if (salaAtual !== (patrimonio.sala_suap || '')) {
    novoStatus = '🟡 Outro local';
  }

  const { error: updatePatError } = await supabase
    .from('patrimonios')
    .update({
      status: novoStatus,
      local_encontrado: novoLocal,
      encontrado_por: novoEncontradoPor,
      encontrado_em: item.ts || new Date().toISOString(),
    })
    .eq('id', patrimonio.id);

  if (updatePatError) throw updatePatError;

  await registrarLog(item, null);
}

async function sincronizarSemPatrimonio(item: SyncItem) {
  if (!item.id || !item.room) throw new Error('Item sem patrimônio incompleto');

  let fotoUrl = item.foto_url || null;
  if (!fotoUrl && item.photo && item.photo.length > 50) {
    fotoUrl = await uploadFoto(item.id, item.photo);
  }

  const { error } = await supabase
    .from('sem_patrimonio')
    .upsert({
      id: item.id,
      sala: String(item.room).trim(),
      descricao: item.desc || '',
      estado: item.estado || '',
      foto_url: fotoUrl,
      funcionario: item.funcionario || null,
      siape: item.siape || null,
      criado_em: item.ts || new Date().toISOString(),
    }, { onConflict: 'id', ignoreDuplicates: false });

  if (error) throw error;

  await registrarLog(item, fotoUrl);
}

async function registrarLog(item: SyncItem, fotoUrl: string | null) {
  const payload = {
    item_id: item.id || null,
    tipo: item.type || null,
    codigo: item.code ? normalizarNumero(item.code) : null,
    sala: item.room || null,
    descricao: item.type === 'nopat' ? item.desc || '' : fotoUrl || '',
    estado: item.estado || null,
    criado_em: item.ts || new Date().toISOString(),
  };

  await supabase.from('log_operacoes').insert(payload);
}

async function uploadFoto(itemId: string, base64data: string) {
  await ensureBucket();
  const parsed = parseBase64Image(base64data);
  const ext = parsed.mime.split('/')[1] || 'jpg';
  const path = `fotos/${itemId}.${ext}`;

  const { error } = await supabase.storage
    .from('sem-patrimonio')
    .upload(path, parsed.bytes, {
      contentType: parsed.mime,
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('sem-patrimonio').getPublicUrl(path);
  return data.publicUrl;
}

function parseBase64Image(base64data: string) {
  let mime = 'image/jpeg';
  let raw = base64data;

  if (base64data.indexOf(',') > -1) {
    const parts = base64data.split(',');
    raw = parts[1];
    const header = parts[0] || '';
    const match = header.match(/data:(.*?);base64/);
    if (match && match[1]) mime = match[1];
  }

  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { mime, bytes };
}

async function ensureBucket() {
  if (bucketReady) return;

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const exists = (buckets || []).some((bucket) => bucket.name === 'sem-patrimonio');
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket('sem-patrimonio', {
      public: true,
      fileSizeLimit: '5MB',
    });
    if (createError && !String(createError.message || '').toLowerCase().includes('already exists')) {
      throw createError;
    }
  }

  bucketReady = true;
}

function normalizarNumero(value: string | undefined) {
  return String(value || '').replace(/^0+/, '').trim();
}

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

const json = (obj: unknown) =>
  new Response(JSON.stringify(obj), {
    headers: { ...cors(), 'Content-Type': 'application/json' },
  });
