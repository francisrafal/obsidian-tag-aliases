import {
  App, Editor, EditorPosition, EditorSuggest, EditorSuggestContext,
  EditorSuggestTriggerInfo, FuzzySuggestModal, Modal, Notice, Plugin,
  PluginSettingTab, Setting, TFile, Menu
} from 'obsidian';
import { aliasTrigger, key, Mapping, parseAliases, suggestAliases, tagName } from './aliases';
import { AliasStore } from './store';

declare module 'obsidian' {
  interface Workspace {
    on(name: 'tag-wrangler:contextmenu', callback: (menu: Menu, tagName: string) => void, ctx?: unknown): import('obsidian').EventRef;
  }
}

export class AliasEditor extends Modal {
  constructor(app: App, private store: AliasStore, private target = '') { super(app); }
  onOpen(): void {
    this.setTitle('Edit tag aliases');
    this.store.refresh();
    let target = this.target;
    const expectedPath = this.store.pagePath(target);
    let aliases = this.store.index.mappings.filter(m => key(m.target) === key(tagName(target) ?? '')).map(m => m.alias).join('\n');
    this.contentEl.createEl('p', { text: 'Use one alias per line. Saving replaces the aliases for this tag. An empty list removes them from an existing tag page.' });
    new Setting(this.contentEl).setName('Canonical tag').addText(text => text.setValue(target).setDisabled(Boolean(this.target)).setPlaceholder('topics/machine-learning').onChange(value => { target = value; }));
    new Setting(this.contentEl).setName('Aliases').addTextArea(text => text.setValue(aliases).setPlaceholder('ml\nmachine-learning').onChange(value => { aliases = value; }));
    const status = this.contentEl.createEl('p', { attr: { role: 'status', 'aria-live': 'polite' } });
    new Setting(this.contentEl).addButton(button => button.setButtonText('Save aliases').setCta().onClick(async () => {
      button.setDisabled(true);
      try {
        const values = parseAliases(aliases.split(/\r?\n/).map(s => s.trim()).filter(Boolean));
        await this.store.save(target, values, expectedPath);
        new Notice('Tag aliases saved.');
        this.close();
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Could not save aliases.';
        button.setDisabled(false);
      }
    }));
  }
  onClose(): void { this.contentEl.empty(); }
}

export class AliasSuggest extends EditorSuggest<Mapping> {
  constructor(app: App, private store: AliasStore) { super(app); this.limit = 50; }
  onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile | null): EditorSuggestTriggerInfo | null {
    const trigger = aliasTrigger(editor.getLine(cursor.line), cursor.ch);
    if (!trigger) return null;
    return { start: { line: cursor.line, ch: trigger.start }, end: cursor, query: trigger.query };
  }
  getSuggestions(context: EditorSuggestContext): Mapping[] { return suggestAliases(context.query, this.store.index); }
  renderSuggestion(value: Mapping, el: HTMLElement): void { el.setText(`#${value.alias} → #${value.target}`); }
  selectSuggestion(value: Mapping): void {
    if (!this.context) return;
    const { editor, start, end } = this.context;
    // Resolve again: a Tag Wrangler rename may have occurred while the popup was open.
    const current = suggestAliases(value.alias, this.store.index).find(m => key(m.alias) === key(value.alias));
    if (!current) { new Notice('This alias changed. Open suggestions again.'); this.close(); return; }
    editor.replaceRange('#' + current.target, start, end);
    editor.setCursor({ line: start.line, ch: start.ch + current.target.length + 1 });
    this.close();
  }
}

class InsertAlias extends FuzzySuggestModal<Mapping> {
  constructor(app: App, private store: AliasStore, private editor: Editor) {
    super(app); this.setPlaceholder('Select a tag alias');
  }
  getItems(): Mapping[] { return this.store.index.mappings; }
  getItemText(item: Mapping): string { return `#${item.alias} → #${item.target}`; }
  onChooseItem(item: Mapping): void {
    const current = this.store.index.mappings.find(m => key(m.alias) === key(item.alias));
    if (current) this.editor.replaceSelection('#' + current.target);
    else new Notice('This alias changed. Open the picker again.');
  }
}

class AliasSettings extends PluginSettingTab {
  constructor(app: App, plugin: Plugin, private store: AliasStore) { super(app, plugin); }
  display(): void {
    this.store.refresh();
    this.containerEl.empty();
    this.containerEl.createEl('h2', { text: 'Tag aliases' });
    this.containerEl.createEl('p', { text: 'Type #@alias to insert a canonical tag, or use the Insert tag by alias command. Nested paths are supported. Reopen settings to refresh this list after editing.' });
    new Setting(this.containerEl).setName('Add or replace aliases').addButton(button => button.setButtonText('Edit aliases').onClick(() => new AliasEditor(this.app, this.store).open()));
    for (const problem of this.store.index.problems) this.containerEl.createEl('p', { text: problem, cls: 'mod-warning' });
    for (const mapping of this.store.index.mappings) {
      new Setting(this.containerEl).setName(`#${mapping.alias} → #${mapping.target}`).setDesc(mapping.path)
        .addButton(button => button.setButtonText('Edit').onClick(() => new AliasEditor(this.app, this.store, mapping.target).open()));
    }
  }
}

export default class TagAliasesPlugin extends Plugin {
  onload(): void {
    const store = new AliasStore(this.app);
    this.app.workspace.onLayoutReady(() => store.refresh());
    this.registerEvent(this.app.metadataCache.on('changed', file => store.update(file)));
    this.registerEvent(this.app.metadataCache.on('resolved', () => store.refresh()));
    this.registerEvent(this.app.vault.on('delete', file => store.remove(file.path)));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      store.remove(oldPath);
      if (file instanceof TFile) store.update(file);
    }));
    this.registerEvent(this.app.workspace.on('tag-wrangler:contextmenu', (menu, tag) => {
      menu.addItem(item => item.setTitle('Edit tag aliases').setIcon('tags').onClick(() => new AliasEditor(this.app, store, tag).open()));
    }));
    this.registerEditorSuggest(new AliasSuggest(this.app, store));
    this.addCommand({ id: 'edit-tag-aliases', name: 'Edit tag aliases', callback: () => new AliasEditor(this.app, store).open() });
    this.addCommand({ id: 'insert-tag-by-alias', name: 'Insert tag by alias', editorCallback: editor => new InsertAlias(this.app, store, editor).open() });
    this.addSettingTab(new AliasSettings(this.app, this, store));
  }
}
