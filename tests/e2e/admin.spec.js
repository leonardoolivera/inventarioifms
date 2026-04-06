import { test, expect } from '@playwright/test';
import { gotoApp, mockDeviceApis, mockSupabase, seedSession } from './support.js';

test.describe('painel admin', () => {
  test.beforeEach(async ({ page }) => {
    await mockDeviceApis(page);
    await mockSupabase(page);
  });

  test('lista funcionarios e permite abrir a gestao', async ({ page }) => {
    await seedSession(page);
    await gotoApp(page);

    await page.evaluate(() => {
      showScreen('scAdmin');
      adminCarregarFunc();
    });

    await expect(page.locator('#adminPanelFunc')).toBeVisible();
    await expect(page.locator('#funcList')).toContainText('Maria Gestora');
    await expect(page.locator('#funcList')).toContainText('Redefinir PIN');
  });
});
