import { test, expect } from '@playwright/test';
import { gotoApp, mockDeviceApis, mockSupabase } from './support.js';

test.describe('login por SIAPE', () => {
  test.beforeEach(async ({ page }) => {
    await mockDeviceApis(page);
    await mockSupabase(page);
  });

  test('exibe tela de login na primeira abertura', async ({ page }) => {
    await gotoApp(page);

    await expect(page.locator('#loginWrap')).toBeVisible();
    await expect(page.locator('#siapeInput')).toBeVisible();
    await expect(page.locator('#pinInput')).toBeVisible();
  });

  test('aceita SIAPE e PIN validos', async ({ page }) => {
    await gotoApp(page);

    await page.fill('#siapeInput', '2394174');
    await page.fill('#pinInput', '0246');
    await page.click('#loginBtn');

    await expect(page.locator('#loginWrap')).toBeHidden();
    await expect(page.locator('#userBadge')).toBeVisible();
    await expect(page.locator('#userName')).toContainText('Leonardo');
  });

  test('mostra erro com credenciais invalidas', async ({ page }) => {
    await gotoApp(page);

    await page.fill('#siapeInput', '2394174');
    await page.fill('#pinInput', '9999');
    await page.click('#loginBtn');

    await expect(page.locator('#loginError')).toContainText('Credenciais invalidas');
  });
});
