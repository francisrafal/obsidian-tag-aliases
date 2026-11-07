import { vi } from 'vitest';
import { TFile } from './obsidian';
export function fixture(initial: Record<string, Record<string, unknown>> = {}) {
  const data = new Map(Object.entries(initial));
  const files = new Map([...data.keys()].map(path => [path, new TFile(path)]));
  const handlers = new Map<string, Function>();
  const on = vi.fn((name: string, handler: Function) => { handlers.set(name, handler); return { name }; });
  const app: any = {
    vault: {
      getMarkdownFiles: () => [...files.values()],
      getAbstractFileByPath: (path: string) => files.get(path),
      on,
      create: vi.fn(async (path: string, text: string) => {
        if (files.has(path)) throw new Error('File exists');
        const file = new TFile(path); files.set(path, file);
        const fm: Record<string, unknown> = {};
        for (const line of text.split('\n').slice(1, 3)) {
          const colon = line.indexOf(':'); fm[line.slice(0, colon)] = JSON.parse(line.slice(colon + 1));
        }
        data.set(path, fm);
        return file;
      })
    },
    metadataCache: { getFileCache: (file: TFile) => ({ frontmatter: data.get(file.path) }), on },
    fileManager: { processFrontMatter: vi.fn(async (file: TFile, callback: Function) => {
      const copy = structuredClone(data.get(file.path)); callback(copy); data.set(file.path, copy);
    }) },
    workspace: { on, onLayoutReady: (callback: Function) => callback() }
  };
  return { app, data, files, handlers };
}
