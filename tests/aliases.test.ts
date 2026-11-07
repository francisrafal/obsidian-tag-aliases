import { describe, expect, it } from 'vitest';
import { aliasTrigger, buildIndex, parseAliases, resolveAlias, suggestAliases, tagName } from '../src/aliases';
const page = (target: string, aliases: unknown, path = target + '.md') => ({ path, tags: ['#' + target], aliases });

describe('input validation', () => {
  it.each(['ml', '#topic/ML', 'Österreich/Ärzte', '研究/方法', '__proto__', 'a-1', '123/a'])('accepts %s', name => expect(tagName(name)).toBeTruthy());
  it.each(['', '#', '123', '12/34', 'a//b', '/a', 'a/', '../../secret', '<script>', 'a b', 'a\nb', 'a:foo', '##a', 'x'.repeat(257), null, {}, ['a']])('rejects %j', name => expect(tagName(name)).toBeNull());
  it('normalizes unicode and deduplicates case', () => {
    expect(parseAliases(['#ML', 'ml', 'cafe\u0301'])).toEqual(['ml', 'café']);
  });
  it('rejects scalar, nested, huge, and invalid alias lists', () => {
    for (const input of ['x', [['x']], Array(1001).fill('x'), ['valid', 'bad tag']]) expect(() => parseAliases(input)).toThrow();
  });
});

describe('resolution', () => {
  it('resolves nested paths and uses the longest matching prefix', () => {
    const index = buildIndex([page('topics/ml', ['ml']), page('special', ['ml/models'])]);
    expect(resolveAlias('#ML/notes', index)?.target).toBe('topics/ml/notes');
    expect(resolveAlias('ml/models/deep', index)?.target).toBe('special/deep');
    expect(resolveAlias('mlx', index)).toBeNull();
    expect(resolveAlias('bad tag', index)).toBeNull();
  });
  it('does not recursively interpret targets or loop', () => {
    const index = buildIndex([page('b', ['a']), page('a', ['b'])]);
    expect(resolveAlias('a', index)?.target).toBe('b');
  });
  it('fails closed on conflicting aliases, including inherited fallback', () => {
    const index = buildIndex([page('a', ['x']), page('b', ['x/y']), page('c', ['X/Y'])]);
    expect(index.problems).toHaveLength(1);
    expect(resolveAlias('x/y/z', index)).toBeNull();
    expect(resolveAlias('x/z', index)?.target).toBe('a/z');
  });
  it('collapses duplicate aliases for the same target after merges', () => {
    const index = buildIndex([page('a', ['x']), page('A', ['X'], 'other.md')]);
    expect(index.problems).toEqual([]);
    expect(index.mappings).toHaveLength(1);
  });
  it('reports malformed pages and ignores unrelated pages', () => {
    const index = buildIndex([
      { path: 'normal.md', tags: [], aliases: undefined },
      { path: 'multi.md', tags: ['#a', '#b'], aliases: ['x'] },
      { path: 'missing.md', tags: [], aliases: ['x'] }, page('a', 'bad')
    ]);
    expect(index.mappings).toEqual([]);
    expect(index.problems).toHaveLength(3);
  });
  it('reflects direct, parent, and case-only Tag Wrangler alias updates', () => {
    for (const target of ['topics/ml', 'research/ml', 'RESEARCH/ML']) {
      const index = buildIndex([page(target, ['ml'])]);
      expect(resolveAlias('ml/child', index)?.target).toBe(target + '/child');
    }
  });
  it('rejects expanded paths over the length limit', () => {
    expect(resolveAlias('a/child', buildIndex([page('x'.repeat(255), ['a'])]))).toBeNull();
  });
  it('provides bounded and unique suggestions including new descendants', () => {
    const index = buildIndex([page('topics/ml', ['ml', 'machine-learning'])]);
    expect(suggestAliases('ml/new', index)).toMatchObject([{ alias: 'ml/new', target: 'topics/ml/new' }]);
    expect(suggestAliases('ml', index)).toHaveLength(1);
    expect(suggestAliases('', buildIndex([page('a', Array.from({ length: 100 }, (_, i) => 'a' + i))]))).toHaveLength(50);
  });
});

describe('editor trigger', () => {
  it.each(['#@ml', 'Hello #@ml', '(#@ml', '[#@ml', '{#@ml'])('triggers at %s', line => {
    expect(aliasTrigger(line, line.length)).toEqual({ start: line.indexOf('#@'), query: 'ml' });
  });
  it.each(['#ml', '## Heading', 'url#@ml', '#@bad tag', '#@<script>'])('does not trigger at %s', line => expect(aliasTrigger(line, line.length)).toBeNull());
  it('uses the cursor position rather than text after it', () => expect(aliasTrigger('#@ml after', 4)).toEqual({ start: 0, query: 'ml' }));
});
