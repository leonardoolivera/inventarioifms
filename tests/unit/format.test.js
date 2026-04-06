import { describe, expect, it } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('format helpers', () => {
  const ctx = runLegacyScript('js/utils/format.js');

  it('escapes unsafe HTML', () => {
    expect(ctx.esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(ctx.esc('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('escHtml also escapes quotes', () => {
    expect(ctx.escHtml('"teste" & <b>x</b>')).toBe('&quot;teste&quot; &amp; &lt;b&gt;x&lt;/b&gt;');
  });

  it('fmtTime returns hour and minute in pt-BR', () => {
    const value = ctx.fmtTime(new Date('2026-04-05T13:45:00'));
    expect(value).toMatch(/13:45|01:45/);
  });

  it('uid generates non-empty unique-ish ids', () => {
    const ids = new Set(Array.from({ length: 20 }, () => ctx.uid()));
    expect(ids.size).toBe(20);
  });
});
