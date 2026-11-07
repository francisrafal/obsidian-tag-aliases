import { beforeEach, describe, expect, it, vi } from 'vitest';
import TagAliasesPlugin, { AliasEditor, AliasSuggest } from '../src/main';
import { AliasStore } from '../src/store';
import { Element, Notice, Setting, TFile } from './obsidian';
import { fixture } from './fixture';

beforeEach(() => { Setting.controls = []; Notice.messages = []; });
const setup = () => {
  const f = fixture({ 'a.md': { aliases: ['#topics/ml'], 'tag-aliases': ['ml'] } });
  const store = new AliasStore(f.app); store.refresh();
  return { ...f, store };
};
describe('editor integration', () => {
  it('inserts a resolved nested target and places the cursor', () => {
    const f = setup(); const suggest = new AliasSuggest(f.app, f.store);
    const editor = { getLine: () => 'Hello #@ml/new', replaceRange: vi.fn(), setCursor: vi.fn() };
    const trigger = suggest.onTrigger({ line: 0, ch: 14 }, editor as any, null)!;
    expect(trigger.query).toBe('ml/new');
    suggest.context = { ...trigger, editor, file: null } as any;
    const options = suggest.getSuggestions(suggest.context!);
    const el = new Element(); suggest.renderSuggestion(options[0]!, el as any);
    expect(el.textContent).toBe('#ml/new → #topics/ml/new');
    suggest.selectSuggestion(options[0]!);
    expect(editor.replaceRange).toHaveBeenCalledWith('#topics/ml/new', { line: 0, ch: 6 }, { line: 0, ch: 14 });
    expect(editor.setCursor).toHaveBeenCalledWith({ line: 0, ch: 20 });
    expect(suggest.closed).toBe(true);
  });
  it('refreshes a target renamed while the popup was open and handles removal', () => {
    const f = setup(); const suggest = new AliasSuggest(f.app, f.store);
    const editor = { getLine: () => '#@ml', replaceRange: vi.fn(), setCursor: vi.fn() };
    suggest.context = { start: { line: 0, ch: 0 }, end: { line: 0, ch: 4 }, query: 'ml', editor } as any;
    const old = f.store.index.mappings[0]!;
    f.data.set('a.md', { aliases: ['#research/ml'], 'tag-aliases': ['ml'] }); f.store.refresh();
    suggest.selectSuggestion(old);
    expect(editor.replaceRange.mock.calls[0]![0]).toBe('#research/ml');
    f.store.remove('a.md'); editor.replaceRange.mockClear(); suggest.selectSuggestion(old);
    expect(editor.replaceRange).not.toHaveBeenCalled();
    expect(Notice.messages).toContain('This alias changed. Open suggestions again.');
    suggest.context = null; suggest.selectSuggestion(old);
    expect(suggest.onTrigger({ line: 0, ch: 0 }, editor as any, null)).toBeNull();
  });
});

describe('alias editor', () => {
  it('loads existing aliases and saves only after the user clicks save', async () => {
    const f = setup(); const modal = new AliasEditor(f.app, f.store, 'topics/ml'); modal.open();
    expect(Setting.controls[0]!.disabled).toBe(true);
    expect(Setting.controls[1]!.value).toBe('ml');
    expect(f.app.fileManager.processFrontMatter).not.toHaveBeenCalled();
    Setting.controls[1]!.change('ml\nmachine-learning');
    await Setting.controls[2]!.click();
    expect(f.data.get('a.md')?.['tag-aliases']).toEqual(['ml', 'machine-learning']);
    expect(modal.closed).toBe(true);
    expect(modal.contentEl.children).toEqual([]);
  });
  it('keeps the dialog open with a safe text error for invalid inputs', async () => {
    const f = setup(); const modal = new AliasEditor(f.app, f.store); modal.open();
    Setting.controls[0]!.change('new'); Setting.controls[1]!.change('<script>');
    await Setting.controls[2]!.click();
    expect(modal.closed).toBe(false);
    expect(Setting.controls[2]!.disabled).toBe(false);
    expect(modal.contentEl.children.at(-1)?.textContent).toContain('valid tag names');
    expect(f.app.vault.create).not.toHaveBeenCalled();
  });
  it('does not recreate an old target after a rename during editing', async () => {
    const f = setup(); const modal = new AliasEditor(f.app, f.store, 'topics/ml'); modal.open();
    f.data.set('a.md', { aliases: ['#new'], 'tag-aliases': ['ml'] });
    await Setting.controls[2]!.click();
    expect(modal.closed).toBe(false);
    expect(f.app.vault.create).not.toHaveBeenCalled();
  });
});

describe('plugin lifecycle', () => {
  it('registers owned events, commands, suggestions, settings, and Tag Wrangler menu', () => {
    const f = setup(); const plugin = new TagAliasesPlugin(f.app); plugin.onload();
    expect(plugin.events).toHaveLength(5);
    expect(plugin.commands).toHaveLength(2);
    plugin.settings.display();
    expect(Setting.controls.some(c => c.text === 'Edit')).toBe(true);
    Setting.controls.find(c => c.text === 'Edit')!.click();
    Setting.controls.find(c => c.text === 'Edit aliases')!.click();
    plugin.commands[0].callback();
    const editor = { replaceSelection: vi.fn() };
    // Capture the public modal open method to inspect the command picker.
    let picker: any;
    const proto = Object.getPrototypeOf(AliasEditor.prototype);
    const original = proto.open;
    const spy = vi.spyOn(proto, 'open').mockImplementation(function (this: any) { picker = this; });
    plugin.commands[1].editorCallback(editor);
    expect(picker.getItemText(picker.getItems()[0])).toContain('#ml');
    picker.onChooseItem(picker.getItems()[0]); expect(editor.replaceSelection).toHaveBeenCalledWith('#topics/ml');
    const stale = picker.getItems()[0];
    f.handlers.get('delete')!(f.files.get('a.md'));
    picker.onChooseItem(stale); expect(Notice.messages.at(-1)).toContain('changed');
    f.handlers.get('changed')!(f.files.get('a.md'));
    f.handlers.get('resolved')!();
    f.handlers.get('rename')!(f.files.get('a.md'), 'old.md');
    f.handlers.get('rename')!({ path: 'folder' }, 'old-folder');
    const item: any = { setTitle: vi.fn(() => item), setIcon: vi.fn(() => item), onClick: vi.fn(cb => { cb(); return item; }) };
    f.handlers.get('tag-wrangler:contextmenu')!({ addItem: (cb: Function) => cb(item) }, '#topics/ml');
    expect(item.setTitle).toHaveBeenCalledWith('Edit tag aliases');
    spy.mockRestore(); expect(proto.open).toBe(original);
    f.data.set('a.md', { aliases: ['#a', '#b'], 'tag-aliases': ['x'] });
    plugin.settings.display();
    expect(plugin.settings.containerEl.children.some((el: Element) => el.textContent.includes('exactly one'))).toBe(true);
  });
});
