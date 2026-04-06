import { test, expect } from '@playwright/test';
import { gotoApp, mockDeviceApis, mockSupabase, seedSession } from './support.js';

test.describe('scanner manual', () => {
  test.beforeEach(async ({ page }) => {
    await mockDeviceApis(page);
    await mockSupabase(page);
  });

  test('registra scan manual com sucesso', async ({ page }) => {
    await seedSession(page);
    await gotoApp(page);

    await page.click('.home-cta');
    await page.fill('#manualInput', '86889');
    await page.keyboard.press('Enter');

    await expect(page.locator('#undoBar')).toHaveClass(/show/);
    await expect(page.locator('#undoCode')).toContainText('86889');
  });

  test('detecta duplicata local no scan manual', async ({ page }) => {
    await seedSession(page, {
      scans: [
        {
          id: 'scan-local',
          type: 'scan',
          code: '86889',
          room: 'ALMOXARIFADO (Bloco A)',
          funcionario: 'Leonardo Alexandre',
          siape: '2394174',
          ts: new Date().toISOString(),
          synced: false
        }
      ]
    });
    await gotoApp(page);

    await page.click('.home-cta');
    await page.fill('#manualInput', '86889');
    await page.keyboard.press('Enter');

    await expect(page.locator('#toast')).toHaveClass(/show/);
    await expect(page.locator('#toastTitle')).toContainText('escaneado');
  });
});
