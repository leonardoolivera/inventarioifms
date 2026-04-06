import { test, expect } from '@playwright/test';
import { gotoApp, mockSupabase, seedSession } from './support.js';

test.describe('fluxo offline', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => false
      });

      navigator.vibrate = () => {};

      if (!navigator.mediaDevices) navigator.mediaDevices = {};
      navigator.mediaDevices.getUserMedia = async () => {
        const error = new Error('Requested device not found');
        error.name = 'NotFoundError';
        throw error;
      };
    });
  });

  test('mantem scan manual salvo localmente quando offline', async ({ page }) => {
    await seedSession(page, { pendingSync: [] });
    await gotoApp(page);

    await page.click('.home-cta');
    await page.fill('#manualInput', '99999');
    await page.keyboard.press('Enter');

    await expect(page.locator('#undoBar')).toHaveClass(/show/);

    const stored = await page.evaluate(() => ({
      scans: JSON.parse(localStorage.getItem('scans') || '[]'),
      pendingSync: JSON.parse(localStorage.getItem('pendingSync') || '[]')
    }));

    expect(stored.scans).toHaveLength(1);
    expect(stored.scans[0].code).toBe('99999');
    expect(stored.pendingSync).toHaveLength(1);
  });
});
