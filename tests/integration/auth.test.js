import { describe, expect, it } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('auth integration', () => {
  it('authenticates valid SIAPE through auth-siape endpoint', async () => {
    const elMap = new Map([
      ['pinLabel', { style: {}, textContent: '' }],
      ['pinInput', { style: {}, value: '' }],
      ['siapeLoginHelp', { textContent: '' }]
    ]);

    const ctx = runLegacyScript('js/features/security.js', {
      SUPABASE_URL: 'https://veazrwcnfamwjnaybpkd.supabase.co',
      SUPABASE_ANON: 'sb_publishable__PGOsNopOsgVgHROJYlwvw_ZKi31B-8',
      loginSiape: async () => ({ ok: false }),
      iniciarApp: () => {},
      adminSalvarFunc: () => {},
      adminFecharAddFunc: () => {},
      document: {
        getElementById(id) {
          return elMap.get(id) || null;
        }
      }
    });

    const result = await ctx.secureLoginSiape('2394174', '0246');
    expect(result.ok).toBe(true);
    expect(result.nome).toBe('Leonardo Alexandre');
  });

  it('rejects invalid credentials', async () => {
    const ctx = runLegacyScript('js/features/security.js', {
      SUPABASE_URL: 'https://veazrwcnfamwjnaybpkd.supabase.co',
      SUPABASE_ANON: 'sb_publishable__PGOsNopOsgVgHROJYlwvw_ZKi31B-8',
      loginSiape: async () => ({ ok: false }),
      iniciarApp: () => {},
      adminSalvarFunc: () => {},
      adminFecharAddFunc: () => {},
      document: { getElementById() { return null; } }
    });

    const result = await ctx.secureLoginSiape('2394174', '9999');
    expect(result.ok).toBe(false);
  });
});
