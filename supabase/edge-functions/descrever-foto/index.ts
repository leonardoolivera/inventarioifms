// Supabase Edge Function — substitui descreverFoto() do Apps Script
// Chave Gemini fica em variável de ambiente segura no Supabase

const PROMPT = 'Descreva o objeto principal da imagem em uma frase curta em português. Inclua tipo, cor e marca se visível. Sem ponto final.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const { mime, b64 } = await req.json();
    if (!b64 || b64.length < 50) {
      return json({ ok: false, erro: 'Imagem muito pequena' });
    }

    const GEMINI_KEY = Deno.env.get('GEMINI_KEY') ?? '';
    if (!GEMINI_KEY) return json({ ok: false, erro: 'Chave Gemini não configurada' });

    const modelos = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];

    for (const modelo of modelos) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mime ?? 'image/jpeg', data: b64 } }
          ]}],
          generationConfig: { maxOutputTokens: 100, temperature: 0.2 }
        })
      });

      const data = await res.json();
      const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (texto && texto.length > 3) {
        return json({ ok: true, descricao: texto.trim() });
      }
    }

    return json({ ok: false, erro: 'IA não retornou texto' });
  } catch (e) {
    return json({ ok: false, erro: String(e) });
  }
});

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

const json = (obj: unknown) =>
  new Response(JSON.stringify(obj), {
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
  });
