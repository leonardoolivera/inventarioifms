import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('supabase client helpers', () => {
  let fetchMock;
  let ctx;

  beforeEach(() => {
    fetchMock = vi.fn();
    ctx = runLegacyScript('supabase/client.js', {
      fetch: fetchMock,
      atob: (value) => Buffer.from(value, 'base64').toString('binary'),
      Blob,
      location: {
        origin: 'http://localhost:5500',
        pathname: '/index.html'
      }
    });
  });

  it('syncs batches and surfaces backend errors', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, sincronizados: 2 }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, erro: 'Falha no lote' }), { status: 200 }));

    const okResult = await ctx.batchSync([{ id: 1 }, { id: 2 }]);
    const failResult = await ctx.batchSync([{ id: 3 }]);

    expect(okResult).toEqual({ ok: true, sincronizados: 2, detalhes: { ok: true, sincronizados: 2 } });
    expect(failResult.ok).toBe(false);
    expect(failResult.erro).toContain('Falha no lote');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/inventario-sync'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('marks patrimonio as found in another room', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { id: 9, sala_suap: 'ALMOXARIFADO (Bloco A)', status: '' }
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    const result = await ctx.marcarEncontrado('00086889', 'BIBLIOTECA (Bloco A)', 'Leonardo Alexandre', '2394174');

    expect(result).toEqual({ encontrado: true, duplicado: '', outroLocal: true });
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/rest/v1/patrimonios?id=eq.9'),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('BIBLIOTECA (Bloco A)')
      })
    );
  });

  it('paginates sbFetchAll until data finishes', async () => {
    const page = Array.from({ length: 1000 }, (_, index) => ({ id: index + 1 }));
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(page), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    const result = await ctx.sbFetchAll('/rest/v1/scans?select=id');

    expect(result).toHaveLength(1000);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('limit=1000&offset=0'),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('limit=1000&offset=1000'),
      expect.any(Object)
    );
  });

  it('uploads photos and returns the public storage url', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    const result = await ctx.uploadFoto('item-1', 'data:image/png;base64,aGVsbG8=');

    expect(result).toContain('/storage/v1/object/public/sem-patrimonio/fotos/item-1.png');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/storage/v1/object/sem-patrimonio/fotos/item-1.png'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'image/png',
          'x-upsert': 'true'
        })
      })
    );
  });

  it('handles admin auth and password recovery helpers', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { siape: '2394174', nome: 'Gestor', admin: true }
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));

    const login = await ctx.loginEmail('gestor@ifms.edu.br', '123456');
    const recovery = await ctx.recuperarSenha('gestor@ifms.edu.br');
    const change = await ctx.trocarSenha('654321', 'token');

    expect(login).toEqual({
      ok: true,
      nome: 'Gestor',
      siape: '2394174',
      admin: true,
      scans: []
    });
    expect(recovery).toEqual({ ok: true });
    expect(change).toEqual({ ok: true });
  });

  it('supports duplicate checks, totals and room comparison helpers', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { status: 'Encontrado', local_encontrado: 'BIBLIOTECA (Bloco A)', encontrado_por: 'Leo' }
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { sala_suap: 'ALMOXARIFADO (Bloco A)', total: 10, correto: 6, outro_local: 1 }
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          numero: '86889',
          descricao: 'Estante de aço',
          sala_suap: 'ALMOXARIFADO (Bloco A)',
          status: '✅ Encontrado',
          local_encontrado: 'ALMOXARIFADO (Bloco A)',
          encontrado_por: 'Leonardo Alexandre'
        }
      ]), { status: 200 }));

    const duplicate = await ctx.checkDuplicate('86889');
    const totals = await ctx.getTotalPorSala();
    const comparacao = await ctx.getComparacaoSala();

    expect(duplicate).toEqual(expect.objectContaining({ ok: true, duplicado: true }));
    expect(totals).toEqual({ ok: true, salas: [{ sala_suap: 'ALMOXARIFADO (Bloco A)', total: 10, correto: 6, outro_local: 1 }] });
    expect(comparacao.ok).toBe(true);
    expect(comparacao.porSala['ALMOXARIFADO (Bloco A)']).toHaveLength(1);
  });

  it('supports siape login, room correction and connection ping', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { siape: '2394174', nome: 'Leonardo Alexandre', admin: true }
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 1 }]), { status: 200 }));

    const login = await ctx.loginSiape('02394174');
    const corrige = await ctx.corrigirSala(['1', '2'], 'BIBLIOTECA (Bloco A)');
    const ping = await ctx.testConnectionSupabase();

    expect(login).toEqual(expect.objectContaining({ ok: true, siape: '2394174', admin: true }));
    expect(corrige).toEqual({ ok: true, corrigidos: 2 });
    expect(ping).toEqual({ ok: true, msg: 'Conexão OK' });
  });

  it('propagates edge function helpers and upload failures', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 500 }));

    const desc = await ctx.descreverFoto('image/jpeg', 'ZmFrZQ==');
    await expect(ctx.uploadFoto('item-2', 'data:image/jpeg;base64,ZmFrZQ==')).rejects.toThrow('Upload falhou: 500');

    expect(desc).toEqual({ ok: true });
  });
});
