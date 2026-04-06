import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('pwa helpers', () => {
  let events;
  let serviceWorkerEvents;
  let updateBanner;
  let updateBannerLogin;
  let installBanner;
  let swReg;
  let ctx;

  beforeEach(() => {
    localStorage.clear();
    events = {};
    serviceWorkerEvents = {};
    updateBanner = { classList: { add: vi.fn(), remove: vi.fn() } };
    updateBannerLogin = { style: { display: 'none' } };
    installBanner = { classList: { add: vi.fn(), remove: vi.fn() } };

    const updateTitle = { textContent: '' };
    const updateSub = { textContent: '' };
    const updateTitleLogin = { textContent: '' };
    const updateSubLogin = { textContent: '' };

    swReg = {
      addEventListener: vi.fn(),
      update: vi.fn(),
      active: { postMessage: vi.fn() }
    };

    ctx = runLegacyScript('js/core/pwa.js', {
      APP_VERSION: 'v1.0.0',
      state: { pendingSync: [] },
      syncNow: vi.fn(() => Promise.resolve()),
      showToast: vi.fn(),
      fetch: vi.fn(() =>
        Promise.resolve({
          text: () => Promise.resolve("const APP_VERSION = 'v1.1.0';")
        })
      ),
      localStorage,
      UPDATE_URL: '/app/index.html',
      navigator: {
        standalone: false,
        serviceWorker: {
          register: vi.fn(() => Promise.resolve(swReg)),
          addEventListener: vi.fn((name, handler) => {
            serviceWorkerEvents[name] = handler;
          }),
          getRegistrations: vi.fn(() => Promise.resolve([{ unregister: vi.fn() }]))
        }
      },
      location: { reload: vi.fn() },
      matchMedia: vi.fn(() => ({ matches: false })),
      addEventListener: vi.fn((name, handler) => {
        events[name] = handler;
      }),
      document: {
        getElementById(id) {
          const map = {
            updateBanner,
            updateBannerLogin,
            updateTitle,
            updateSub,
            updateTitleLogin,
            updateSubLogin,
            installBanner
          };
          return map[id] || null;
        }
      },
      setInterval: vi.fn()
    });
  });

  it('shows update banner when a newer app version is found', async () => {
    ctx.checkForUpdate();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.fetch).toHaveBeenCalledWith(expect.stringContaining('/app/index.html?nocache='), { cache: 'no-store' });
    expect(updateBanner.classList.add).toHaveBeenCalledWith('show');
    expect(updateBannerLogin.style.display).toBe('flex');
  });

  it('registers service worker updates and reacts to sw messages', async () => {
    ctx.registerServiceWorkerUpdates();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.navigator.serviceWorker.register).toHaveBeenCalled();
    expect(swReg.update).toHaveBeenCalled();
    expect(swReg.active.postMessage).toHaveBeenCalledWith({ type: 'GET_VERSION' });

    serviceWorkerEvents.message({ data: { type: 'SW_ACTIVATED' } });
    expect(ctx.location.reload).toHaveBeenCalled();
  });

  it('stores deferred install prompt and reveals install banner', () => {
    localStorage.removeItem('installDismissed');
    const promptEvent = { preventDefault: vi.fn() };

    events.beforeinstallprompt(promptEvent);

    expect(promptEvent.preventDefault).toHaveBeenCalled();
    expect(installBanner.classList.add).toHaveBeenCalledWith('show');
    expect(ctx.deferredInstallPrompt).toBe(promptEvent);
  });

  it('prompts install flow and can dismiss banner permanently', async () => {
    ctx.deferredInstallPrompt = {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' })
    };

    ctx.doInstall();
    await new Promise((resolve) => setTimeout(resolve, 0));
    ctx.dismissInstall();

    expect(installBanner.classList.remove).toHaveBeenCalledWith('show');
    expect(localStorage.getItem('installDismissed')).toBe('1');
  });

  it('marks first standalone open to trigger welcome flow', () => {
    localStorage.removeItem('appAberto');
    ctx.matchMedia = vi.fn(() => ({ matches: true }));

    ctx.detectStandaloneWelcome();

    expect(localStorage.getItem('appAberto')).toBe('1');
    expect(ctx._mostrarBoasVindas).toBe(true);
  });
});
