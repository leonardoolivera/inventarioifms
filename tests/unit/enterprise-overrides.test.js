import { describe, expect, it } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('enterprise overrides shell', () => {
  it('loads shared ui override placeholder without side effects', () => {
    const ctx = runLegacyScript('js/ui/enterprise-overrides.js');
    expect(ctx).toBeTruthy();
  });
});
