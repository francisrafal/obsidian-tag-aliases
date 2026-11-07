import { App, TFile, parseFrontMatterAliases } from 'obsidian';
import { ALIAS_PROPERTY, AliasIndex, Page, buildIndex, key, parseAliases, tagName } from './aliases';

export function pageFromFrontmatter(path: string, frontmatter: Record<string, unknown> | undefined): Page {
  return {
    path,
    tags: (parseFrontMatterAliases(frontmatter) ?? []).filter(alias => alias.startsWith('#')),
    aliases: frontmatter?.[ALIAS_PROPERTY]
  };
}

export class AliasStore {
  private pages = new Map<string, Page>();
  index: AliasIndex = buildIndex([]);
  constructor(private app: App) {}

  refresh(): void {
    this.pages.clear();
    for (const file of this.app.vault.getMarkdownFiles()) this.read(file);
    this.rebuild();
  }
  update(file: TFile): void { this.read(file); this.rebuild(); }
  remove(path: string): void { this.pages.delete(path); this.rebuild(); }
  private read(file: TFile): void {
    if (file.extension !== 'md') return;
    const cache = this.app.metadataCache.getFileCache(file);
    this.pages.set(file.path, pageFromFrontmatter(file.path, cache?.frontmatter));
  }
  private rebuild(): void { this.index = buildIndex([...this.pages.values()]); }

  pagePath(target: string): string | undefined {
    return [...this.pages.values()].find(page => page.tags.some(tag => key(tagName(tag) ?? '') === key(tagName(target) ?? '')))?.path;
  }

  async save(targetInput: string, aliasesInput: unknown, expectedPath?: string): Promise<TFile> {
    const target = tagName(targetInput);
    if (!target) throw new Error('Enter a valid canonical tag.');
    const aliases = parseAliases(aliasesInput);
    // Refresh before writes so an open modal does not use an old rename target.
    this.refresh();
    const matches = [...this.pages.values()].filter(page =>
      page.tags.some(tag => key(tagName(tag) ?? '') === key(target)));
    if (matches.length > 1) throw new Error('Multiple tag pages exist for this tag. Keep one tag page before editing aliases.');
    const existing = matches[0];
    if (expectedPath !== undefined && existing?.path !== expectedPath) {
      throw new Error('The tag page changed while editing. Reopen the alias editor.');
    }
    if (existing && existing.tags.length !== 1) throw new Error('This tag page has more than one tag. Use a separate page for each tag.');
    for (const alias of aliases) {
      const collision = [...this.pages.values()].some(page => {
        if (page.path === existing?.path || page.aliases === undefined) return false;
        try { return parseAliases(page.aliases).some(a => key(a) === key(alias)); }
        catch { return false; }
      });
      if (collision) throw new Error(`Alias #${alias} is already defined on another page.`);
    }
    if (existing) {
      const file = this.app.vault.getAbstractFileByPath(existing.path);
      if (!(file instanceof TFile)) throw new Error('The tag page moved or was deleted. Try again.');
      await this.app.fileManager.processFrontMatter(file, frontmatter => {
        const current = pageFromFrontmatter(file.path, frontmatter);
        if (current.tags.length !== 1 || key(tagName(current.tags[0]) ?? '') !== key(target)) {
          throw new Error('The tag was renamed while editing. Reopen the alias editor.');
        }
        // Only our property is changed. Other page properties and text are preserved.
        if (aliases.length) frontmatter[ALIAS_PROPERTY] = aliases;
        else delete frontmatter[ALIAS_PROPERTY];
      });
      return file;
    }
    if (!aliases.length) throw new Error('Enter at least one alias.');
    // The path never contains user input. Vault.create refuses to overwrite a file.
    const path = `Tag aliases ${globalThis.crypto.randomUUID()}.md`;
    return this.app.vault.create(path, [
      '---', `aliases: ${JSON.stringify(['#' + target])}`,
      `${ALIAS_PROPERTY}: ${JSON.stringify(aliases)}`, '---', '',
      'This tag page stores shortcuts for Tag Aliases. Rename its tag with Tag Wrangler.', ''
    ].join('\n'));
  }
}
