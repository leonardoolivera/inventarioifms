import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('security helpers', () => {
  let ctx;
  let elements;

  beforeEach(() => {
    elements = new Map([
      ['pinLabel', { style: {}, textContent: '' }],
      ['pinInput', { style: {}, value: '' }],
      ['siapeLoginHelp', { textContent: '' }]
    ]);

    ctx = runLegacyScript('js/features/security.js', {
      SUPABASE_URL: 'https://veazrwcnfamwjnaybpkd.supabase.co',
      SUPABASE_ANON: 'sb_publishable__PGOsNopOsgVgHROJYlwvw_ZKi31B-8',
      loginSiape: async () => ({ ok: false }),
      iniciarApp: () => {},
      adminSalvarFunc: () => {},
      adminFecharAddFunc: () => {},
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      }
    });
  });

  it('blocks auth after configured max attempts', () => {
    for (let i = 0; i < ctx.AUTH_MAX_ATTEMPTS; i++) {
      ctx.registerAuthFailure('siape');
    }
    expect(ctx.canAttemptAuth('siape')).toBe(false);
  });

  it('expires stale stored session', () => {
    localStorage.setItem('currentUser', JSON.stringify({ siape: '2394174' }));
    localStorage.setItem('currentUserSavedAt', String(Date.now() - ctx.AUTH_SESSION_MAX_AGE_MS - 1000));

    ctx.expireStoredSessionIfNeeded();

    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(localStorage.getItem('currentUserSavedAt')).toBeNull();
  });

  it('updates login help text when PIN is required', () => {
    ctx.updateSecurityLoginUI();
    expect(elements.get('pinLabel').style.display).toBe('block');
    expect(elements.get('pinInput').style.display).toBe('block');
    expect(elements.get('siapeLoginHelp').textContent).toContain('SIAPE e PIN');
  });
});
