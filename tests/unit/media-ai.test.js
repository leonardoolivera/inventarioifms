import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('media and ai helpers', () => {
  let elements;
  let store;
  let ctx;

  function createDb() {
    return {
      transaction() {
        return {
          objectStore() {
            return {
              put(payload) {
                const req = {};
                queueMicrotask(() => {
                  store.set(payload.id, payload);
                  req.onsuccess?.({ target: { result: payload } });
                });
                return req;
              },
              get(id) {
                const req = {};
                queueMicrotask(() => {
                  req.onsuccess?.({ target: { result: store.get(id) || null } });
                });
                return req;
              },
              delete(id) {
                store.delete(id);
              },
              getAll() {
                const req = {};
                queueMicrotask(() => {
                  req.onsuccess?.({ target: { result: Array.from(store.values()) } });
                });
                return req;
              }
            };
          }
        };
      },
      createObjectStore: vi.fn()
    };
  }

  beforeEach(() => {
    localStorage.clear();
    store = new Map();
    elements = new Map([
      ['geminiKeyInput', { value: '', placeholder: '' }],
      ['testIABtn', { textContent: 'Testar', disabled: false }],
      ['suggestBtn', { innerHTML: '', disabled: false, style: { opacity: '1' } }],
      ['noPatDesc', { value: '', placeholder: '', style: { borderColor: '' } }]
    ]);

    const db = createDb();
    const indexedDB = {
      open: vi.fn(() => {
        const req = {};
        queueMicrotask(() => {
          req.onupgradeneeded?.({ target: { result: db } });
          req.onsuccess?.({ target: { result: db } });
        });
        return req;
      })
    };

    ctx = runLegacyScript('js/features/media-ai.js', {
      indexedDB,
      showToast: vi.fn(),
      descreverFoto: vi.fn(() => Promise.resolve({ ok: true, descricao: 'Monitor LCD' })),
      noPatPhoto: 'data:image/jpeg;base64,ZmFrZQ==',
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        }
      },
      setTimeout: vi.fn((fn) => {
        fn();
        return 1;
      })
    });
  });

  it('persists and loads photos from indexed db wrapper', async () => {
    await ctx.idbSalvarFoto('scan-1', 'base64-data');

    await expect(ctx.idbCarregarFoto('scan-1')).resolves.toBe('base64-data');
    await expect(ctx.idbCarregarTodas()).resolves.toEqual([
      expect.objectContaining({ id: 'scan-1', foto: 'base64-data' })
    ]);

    await ctx.idbDeletarFoto('scan-1');
    await expect(ctx.idbCarregarFoto('scan-1')).resolves.toBe(null);
  });

  it('stores and restores gemini key locally', () => {
    elements.get('geminiKeyInput').value = 'gem-key-123';

    ctx.saveGeminiKey();
    elements.get('geminiKeyInput').value = '';
    ctx.loadGeminiKey();

    expect(localStorage.getItem('geminiKey')).toBe('gem-key-123');
    expect(elements.get('geminiKeyInput').value).toBe('gem-key-123');
    expect(ctx.showToast).toHaveBeenCalled();
  });

  it('fills description field when ai suggestion succeeds', async () => {
    ctx.sugerirDescricao(false);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(elements.get('noPatDesc').value).toBe('Monitor LCD');
    expect(elements.get('suggestBtn').disabled).toBe(false);
    expect(elements.get('noPatDesc').placeholder).toContain('Ex:');
    expect(ctx.showToast).toHaveBeenCalled();
  });
});
