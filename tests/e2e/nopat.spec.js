import { test, expect } from '@playwright/test';
import { gotoApp, mockDeviceApis, mockSupabase, seedSession } from './support.js';

test.describe('item sem patrimonio', () => {
  test.beforeEach(async ({ page }) => {
    await mockDeviceApis(page);
    await mockSupabase(page);
  });

  test('registra item sem patrimonio sem depender da camera', async ({ page }) => {
    await seedSession(page);
    await gotoApp(page);

    await page.click('.home-cta');
    await page.evaluate(() => {
      window.abrirCamera = () => {};
      openNoPatModal();
    });

    await expect(page.locator('#noPatModal')).toHaveClass(/show/);
    await page.fill('#noPatDesc', 'Monitor sem etiqueta');
    await page.click('.estado-chip.bom');
    await page.click('.modal-save-btn');

    await expect(page.locator('#noPatModal')).not.toHaveClass(/show/);

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('scans') || '[]'));
    expect(stored).toHaveLength(1);
    expect(stored[0].type).toBe('nopat');
    expect(stored[0].desc).toBe('Monitor sem etiqueta');
  });
});
