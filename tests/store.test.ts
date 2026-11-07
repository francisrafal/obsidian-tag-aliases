import { describe, expect, it } from 'vitest';
import { AliasStore, pageFromFrontmatter } from '../src/store';
import { resolveAlias } from '../src/aliases';
import { fixture } from './fixture';
import { TFile } from './obsidian';

describe('vault persistence', () => {
  it('reads Tag Wrangler capitalized Aliases and ignores ordinary note aliases', () => {
    expect(pageFromFrontmatter('x.md', { Aliases: ['#topic/ml', 'ordinary'], 'tag-aliases': ['ml'] })).toEqual({ path: 'x.md', tags: ['#topic/ml'], aliases: ['ml'] });
    expect(pageFromFrontmatter('x.md', undefined).tags).toEqual([]);
  });
  it('creates a portable tag page with a generated safe path', async () => {
    const f = fixture(); const store = new AliasStore(f.app);
    const file = await store.save('#topic/ml', ['ml', '__proto__']);
    expect(file.path).toMatch(/^Tag aliases [0-9a-f-]+\.md$/);
    expect(f.data.get(file.path)).toEqual({ aliases: ['#topic/ml'], 'tag-aliases': ['ml', '__proto__'] });
    store.refresh(); expect(resolveAlias('ml/sub', store.index)?.target).toBe('topic/ml/sub');
  });
  it('reuses an existing tag page and preserves unrelated fields', async () => {
    const f = fixture({ 'page.md': { Aliases: ['#topic/ml', 'Machine learning'], owner: 'Francis' } });
    const store = new AliasStore(f.app);
    await store.save('topic/ml', ['ml']);
    expect(f.app.vault.create).not.toHaveBeenCalled();
    expect(f.data.get('page.md')).toEqual({ Aliases: ['#topic/ml', 'Machine learning'], owner: 'Francis', 'tag-aliases': ['ml'] });
    await store.save('topic/ml', []);
    expect(f.data.get('page.md')).not.toHaveProperty('tag-aliases');
  });
  it('rejects ambiguous tag pages and collisions without writes', async () => {
    const f = fixture({ 'a.md': { aliases: ['#a'], 'tag-aliases': ['x'] }, 'b.md': { aliases: ['#b'] } });
    const store = new AliasStore(f.app);
    await expect(store.save('b', ['X'])).rejects.toThrow('already defined');
    f.data.set('b.md', { aliases: ['#a'] });
    await expect(store.save('a', ['y'])).rejects.toThrow('Multiple');
    f.data.set('b.md', { aliases: ['#b', '#c'] });
    await expect(store.save('b', ['y'])).rejects.toThrow('more than one');
    expect(f.app.fileManager.processFrontMatter).not.toHaveBeenCalled();
  });
  it('rejects invalid tags, empty new records, and changed expected pages', async () => {
    const f = fixture(); const store = new AliasStore(f.app);
    await expect(store.save('../bad', ['x'])).rejects.toThrow('valid');
    await expect(store.save('a', [])).rejects.toThrow('at least one');
    await expect(store.save('a', ['x'], 'gone.md')).rejects.toThrow('changed');
  });
  it('guards a rename during a frontmatter write', async () => {
    const f = fixture({ 'a.md': { aliases: ['#a'], 'tag-aliases': ['x'] } });
    const store = new AliasStore(f.app);
    f.app.fileManager.processFrontMatter.mockImplementation(async (_file: TFile, callback: Function) => callback({ aliases: ['#renamed'] }));
    await expect(store.save('a', ['new'])).rejects.toThrow('renamed');
    expect(f.data.get('a.md')?.['tag-aliases']).toEqual(['x']);
  });
  it('guards deletion between cache refresh and file lookup', async () => {
    const f = fixture({ 'a.md': { aliases: ['#a'] } });
    f.app.vault.getAbstractFileByPath = () => null;
    await expect(new AliasStore(f.app).save('a', ['x'])).rejects.toThrow('moved or was deleted');
  });
  it('follows renamed targets, removes deleted pages, and ignores attachments', () => {
    const f = fixture({ 'a.md': { aliases: ['#a'], 'tag-aliases': ['x'] } });
    const store = new AliasStore(f.app); store.refresh();
    expect(store.pagePath('a')).toBe('a.md');
    f.data.set('a.md', { aliases: ['#b'], 'tag-aliases': ['x'] });
    store.update(f.files.get('a.md')! as any);
    expect(resolveAlias('x/sub', store.index)?.target).toBe('b/sub');
    const attachment = new TFile('image.png'); attachment.extension = 'png'; store.update(attachment as any);
    store.remove('a.md'); expect(store.index.mappings).toEqual([]);
  });
});
