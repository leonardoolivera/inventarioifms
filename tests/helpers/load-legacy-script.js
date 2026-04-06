import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function runLegacyScript(relPath, overrides = {}) {
  const filename = path.resolve(process.cwd(), relPath);
  const source = fs.readFileSync(filename, 'utf8');
  const context = {
    console,
    Date,
    Math,
    JSON,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    localStorage,
    sessionStorage,
    fetch,
    navigator: globalThis.navigator,
    document: {
      getElementById: () => null,
      addEventListener: () => {},
      querySelector: () => null
    },
    window: null,
    globalThis: null,
    ...overrides
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename });
  return context;
}
