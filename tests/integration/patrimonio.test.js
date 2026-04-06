import { describe, expect, it } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('patrimonio integration', () => {
  const ctx = runLegacyScript('supabase/client.js', {
    atob: (value) => Buffer.from(value, 'base64').toString('binary'),
    Blob
  });

  it('looks up patrimonio by exact code', async () => {
    const result = await ctx.lookupPatrimonio('00086889');
    expect(result.ok).toBe(true);
    expect(result.numero).toBe('86889');
    expect(result.salaOriginal).toBe('ALMOXARIFADO (Bloco A)');
  });

  it('returns false when patrimonio does not exist', async () => {
    const result = await ctx.lookupPatrimonio('99999');
    expect(result.ok).toBe(false);
  });

  it('searches patrimonio by partial code', async () => {
    const result = await ctx.buscarPatrimonio('868');
    expect(result.ok).toBe(true);
    expect(result.resultados.length).toBeGreaterThan(0);
    expect(result.resultados[0].numero).toContain('868');
  });

  it('short search returns empty results', async () => {
    const result = await ctx.buscarPatrimonio('86');
    expect(result.ok).toBe(true);
    expect(result.resultados).toEqual([]);
  });
});
