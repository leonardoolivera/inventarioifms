import { test, expect } from '@playwright/test';
import { gotoApp, mockDeviceApis, mockSupabase, seedSession } from './support.js';

test.describe('selecao de salas', () => {
  test.beforeEach(async ({ page }) => {
    await mockDeviceApis(page);
    await mockSupabase(page);
  });

  test('abre a lista e filtra salas', async ({ page }) => {
    await seedSession(page);
    await gotoApp(page);

    await page.click('.room-selector');
    await expect(page.locator('#scRooms')).toBeVisible();

    await page.fill('#roomSearch', 'almox');
    await expect(page.locator('.ri-name').first()).toContainText(/almox/i);
  });

  test('seleciona sala e atualiza o resumo da home', async ({ page }) => {
    await seedSession(page, { room: 'BIBLIOTECA (Bloco A)' });
    await gotoApp(page);

    await page.click('.room-selector');
    await page.locator('.room-item').first().click();

    await expect(page.locator('#currentRoomLabel')).not.toContainText('Selecionar local');
  });

  test('permite priorizar uma sala', async ({ page }) => {
    await seedSession(page);
    await gotoApp(page);

    await page.click('.room-selector');
    const pinBtn = page.locator('.room-pin-btn').first();
    await pinBtn.click();

    await expect(page.locator('.room-group-title').first()).toContainText('Priorit');
  });
});
