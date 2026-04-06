import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('router helpers', () => {
  let screens;
  let currentScreen;
  let ctx;

  beforeEach(() => {
    screens = new Map([
      ['scHome', { id: 'scHome', classList: { add: vi.fn(), remove: vi.fn() } }],
      ['scHistory', { id: 'scHistory', classList: { add: vi.fn(), remove: vi.fn() } }],
      ['scSettings', { id: 'scSettings', classList: { add: vi.fn(), remove: vi.fn() } }],
      ['scDashboard', { id: 'scDashboard', classList: { add: vi.fn(), remove: vi.fn() } }],
      ['scMinhasSalas', { id: 'scMinhasSalas', classList: { add: vi.fn(), remove: vi.fn() } }],
      ['scCampus', { id: 'scCampus', classList: { add: vi.fn(), remove: vi.fn() } }]
    ]);
    currentScreen = screens.get('scHome');

    ctx = runLegacyScript('js/core/router.js', {
      screenHistory: [],
      campusData: null,
      renderHistList: vi.fn(),
      renderRoomList: vi.fn(),
      renderSettRooms: vi.fn(),
      loadScriptUrl: vi.fn(),
      carregarTotaisSUAP: vi.fn((callback) => callback()),
      renderMinhasSalas: vi.fn(),
      carregarCampus: vi.fn(),
      updateStats: vi.fn(),
      updateSyncBanner: vi.fn(),
      carregarDashboard: vi.fn(),
      document: {
        querySelector(selector) {
          if (selector === '.screen:not(.hidden):not(.slide-left)') return currentScreen;
          return null;
        },
        getElementById(id) {
          return screens.get(id) || null;
        }
      }
    });
  });

  it('navigates to target screen and triggers screen hooks', () => {
    ctx.showScreen('scHistory');

    expect(ctx.screenHistory).toEqual(['scHome']);
    expect(currentScreen.classList.add).toHaveBeenCalledWith('slide-left');
    expect(screens.get('scHistory').classList.remove).toHaveBeenCalledWith('hidden', 'slide-left');
    expect(ctx.renderHistList).toHaveBeenCalled();
  });

  it('loads settings dependencies when opening settings', () => {
    ctx.showScreen('scSettings');

    expect(ctx.renderSettRooms).toHaveBeenCalled();
    expect(ctx.loadScriptUrl).toHaveBeenCalled();
  });

  it('returns to the previous screen on back navigation', () => {
    ctx.screenHistory.push('scDashboard');
    currentScreen = screens.get('scHistory');

    ctx.goBack();

    expect(currentScreen.classList.add).toHaveBeenCalledWith('hidden');
    expect(currentScreen.classList.remove).toHaveBeenCalledWith('slide-left');
    expect(screens.get('scDashboard').classList.remove).toHaveBeenCalledWith('hidden', 'slide-left');
  });

  it('loads home, campus and minhas salas dependencies when requested', () => {
    ctx.showScreen('scHome');
    expect(ctx.updateStats).toHaveBeenCalled();
    expect(ctx.updateSyncBanner).toHaveBeenCalled();

    ctx.showScreen('scMinhasSalas');
    expect(ctx.carregarTotaisSUAP).toHaveBeenCalled();
    expect(ctx.renderMinhasSalas).toHaveBeenCalled();

    ctx.showScreen('scCampus');
    expect(ctx.carregarCampus).toHaveBeenCalled();
  });

  it('ignores navigation when target screen does not exist and falls back to home on back', () => {
    ctx.showScreen('scMissing');
    expect(ctx.screenHistory).toEqual(['scHome']);

    ctx.screenHistory = [];
    currentScreen = screens.get('scDashboard');
    ctx.goBack();

    expect(screens.get('scHome').classList.remove).toHaveBeenCalledWith('hidden', 'slide-left');
  });
});
