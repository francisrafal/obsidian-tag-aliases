// Small public-API test double. Native Obsidian acceptance remains a separate check.
export class TFile {
  extension = 'md';
  constructor(public path: string) {}
}
export function parseFrontMatterAliases(fm: Record<string, unknown> | undefined): string[] | null {
  const k = Object.keys(fm ?? {}).find(k => /^aliases?$/i.test(k));
  const value = k ? fm![k] : undefined;
  if (typeof value === 'string') return value.split(',').map(s => s.trim());
  return Array.isArray(value) ? value.filter(v => typeof v === 'string') : null;
}
export class Element {
  children: Element[] = [];
  textContent = '';
  createEl(_tag: string, opts: any = {}) { const child = new Element(); child.textContent = opts.text ?? ''; this.children.push(child); return child; }
  setText(text: string) { this.textContent = text; }
  empty() { this.children = []; }
}
export class Modal {
  contentEl = new Element();
  closed = false;
  constructor(public app: any) {}
  setTitle(_text: string) {}
  open() { (this as any).onOpen?.(); }
  close() { this.closed = true; (this as any).onClose?.(); }
}
export class EditorSuggest<T> extends Modal { limit = 0; context: any = null; }
export class FuzzySuggestModal<T> extends Modal { setPlaceholder(_value: string) {} }
export class Notice { static messages: string[] = []; constructor(message: string) { Notice.messages.push(message); } }
export class Control {
  value = ''; disabled = false; text = ''; change: any; click: any;
  setValue(value: string) { this.value = value; return this; }
  setPlaceholder(_value: string) { return this; }
  setDisabled(value: boolean) { this.disabled = value; return this; }
  setButtonText(value: string) { this.text = value; return this; }
  setCta() { return this; }
  onChange(callback: any) { this.change = callback; return this; }
  onClick(callback: any) { this.click = callback; return this; }
}
export class Setting {
  static controls: Control[] = [];
  constructor(_el: any) {}
  setName(_value: string) { return this; }
  setDesc(_value: string) { return this; }
  addText(callback: any) { const c = new Control(); Setting.controls.push(c); callback(c); return this; }
  addTextArea(callback: any) { return this.addText(callback); }
  addButton(callback: any) { return this.addText(callback); }
}
export class PluginSettingTab {
  containerEl = new Element();
  constructor(public app: any, _plugin: any) {}
}
export class Plugin {
  events: any[] = []; commands: any[] = []; suggest: any; settings: any;
  constructor(public app: any) {}
  registerEvent(event: any) { this.events.push(event); }
  registerEditorSuggest(suggest: any) { this.suggest = suggest; }
  addCommand(command: any) { this.commands.push(command); }
  addSettingTab(settings: any) { this.settings = settings; }
}
