/** Pure alias model. All keys are case-insensitive, as in Obsidian. */
export const ALIAS_PROPERTY = 'tag-aliases';
export const MAX_ALIASES = 1000;
export type Mapping = { alias: string; target: string; path: string };
export type Page = { path: string; tags: string[]; aliases: unknown };
export type AliasIndex = { mappings: Mapping[]; problems: string[]; blocked: string[] };

export function tagName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/^#/, '').normalize('NFC');
  if (!name || name.length > 256 || !/^[\p{L}\p{M}\p{N}_/-]+$/u.test(name)) return null;
  if (name.split('/').some(part => !part) || !/[^\p{N}/]/u.test(name)) return null;
  return name;
}
export const key = (value: string): string => value.normalize('NFC').toLowerCase();
export const within = (value: string, parent: string): boolean =>
  key(value) === key(parent) || key(value).startsWith(key(parent) + '/');

export function parseAliases(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_ALIASES) {
    throw new Error(`Aliases must be a list of at most ${MAX_ALIASES} tag names.`);
  }
  const result = new Map<string, string>();
  for (const entry of value) {
    const name = tagName(entry);
    if (!name) throw new Error('Aliases must be valid tag names (letters, numbers, _, -, and /).');
    result.set(key(name), name);
  }
  return [...result.values()];
}

export function buildIndex(pages: Page[]): AliasIndex {
  const candidates: Mapping[] = [];
  const problems: string[] = [];
  for (const page of pages) {
    if (page.aliases === undefined) continue;
    try {
      const targets = [...new Set(page.tags.map(tagName).filter((t): t is string => t !== null))];
      if (targets.length !== 1) throw new Error('An alias page must have exactly one #tag in its aliases property.');
      const target = targets[0]!;
      for (const alias of parseAliases(page.aliases)) candidates.push({ alias, target, path: page.path });
    } catch (error) {
      problems.push(`${page.path}: ${error instanceof Error ? error.message : 'Invalid alias page.'}`);
    }
  }
  const grouped = new Map<string, Mapping[]>();
  for (const mapping of candidates) {
    const group = grouped.get(key(mapping.alias)) ?? [];
    group.push(mapping);
    grouped.set(key(mapping.alias), group);
  }
  const mappings: Mapping[] = [];
  const blocked: string[] = [];
  for (const group of grouped.values()) {
    if (new Set(group.map(m => key(m.target))).size > 1) {
      blocked.push(group[0]!.alias);
      problems.push(`Conflicting alias #${group[0]!.alias}: ${group.map(m => m.path).join(', ')}`);
    } else mappings.push(group[0]!);
  }
  return { mappings: mappings.sort((a, b) => b.alias.length - a.alias.length || a.alias.localeCompare(b.alias)), problems, blocked };
}

/** One substitution only: canonical targets are never recursively reinterpreted. */
export function resolveAlias(input: string, index: AliasIndex): Mapping | null {
  const name = tagName(input);
  if (!name) return null;
  // A conflicting more-specific alias must not fall back to a parent alias.
  const match = index.mappings.find(m => within(name, m.alias));
  if (!match || index.blocked.some(alias => within(name, alias) && alias.length >= match.alias.length)) return null;
  const target = tagName(match.target + name.slice(match.alias.length));
  return target ? { ...match, target } : null;
}

export function suggestAliases(query: string, index: AliasIndex): Mapping[] {
  const exact = resolveAlias(query, index);
  const results = index.mappings.filter(m => key(m.alias).includes(key(query)));
  if (exact) results.unshift({ ...exact, alias: tagName(query)! });
  const seen = new Set<string>();
  return results.filter(m => {
    const id = key(m.alias) + '\0' + key(m.target);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, 50);
}

export function aliasTrigger(line: string, column: number): { start: number; query: string } | null {
  const prefix = line.slice(0, column);
  const match = /(?:^|[\s(\[{])#@([\p{L}\p{M}\p{N}_/-]*)$/u.exec(prefix);
  if (!match) return null;
  return { start: column - match[1]!.length - 2, query: match[1]! };
}
