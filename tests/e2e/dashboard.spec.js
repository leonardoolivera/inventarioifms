import { test, expect } from '@playwright/test';
import { gotoApp, mockDeviceApis, mockSupabase, seedSession } from './support.js';

test.describe('visao geral', () => {
  test.beforeEach(async ({ page }) => {
    await mockDeviceApis(page);
    await mockSupabase(page);
  });

  test('carrega kpis e feed do dashboard', async ({ page }) => {
    await seedSession(page);
    await gotoApp(page);

    await page.click('#adminBtn .home-row-btn');

    await expect(page.locator('#scDashboard')).toBeVisible();
    await expect(page.locator('#dbLiveBadge')).toContainText('ao vivo');
    await expect(page.locator('#dbKpiEnc')).not.toContainText('—');
    await expect(page.locator('#dbFeed')).toContainText('Leonardo Alexandre');
    await expect(page.locator('#dbAlertas')).not.toContainText('Carregando');
  });
});
