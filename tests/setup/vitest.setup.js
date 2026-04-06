import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './msw.handlers.js';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  localStorage.clear();
});
afterAll(() => server.close());

if (!globalThis.navigator) globalThis.navigator = {};
globalThis.navigator.vibrate = vi.fn();
globalThis.BarcodeDetector = undefined;
