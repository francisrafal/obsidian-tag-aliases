import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { File } from './vendor/tag-wrangler/File';
import { Tag, Replacement } from './vendor/tag-wrangler/Tag';
import { buildIndex, resolveAlias } from '../src/aliases';
import { pageFromFrontmatter } from '../src/store';

describe('real Tag Wrangler frontmatter rewrite compatibility', () => {
  it.each([
    ['topics/ml', 'topics/ml', 'research/ai', 'research/ai'],
    ['topics/ml', 'topics', 'research', 'research/ml'],
    ['topics/ml', 'topics/ml', 'Topics/ML', 'Topics/ML'],
    // Upstream does not rewrite an exact tag whose casing differs from the rename source.
    ['topics/ml', 'TOPICS/ML', 'Topics/ML', 'topics/ml'],
    ['topics/ml', 'topics/ml', 'topics', 'topics'],
    ['topics/ml', 'other', 'renamed', 'topics/ml']
  ])('rewrites %s through %s → %s', (target, oldName, newName, expected) => {
    const original = `---\nAliases: ["#${target}", "Machine learning"]\ntag-aliases: ["ml", "ai/ml"]\nowner: Francis\n---\n\nUntouched body with #example\n`;
    const file = new File({}, 'page.md', [], true);
    const changed = file.replaceInFrontMatter(original, new Replacement(new Tag(oldName), new Tag(newName)));
    const fm = parse(changed.split('---')[1]);
    expect(fm['tag-aliases']).toEqual(['ml', 'ai/ml']);
    expect(fm.owner).toBe('Francis');
    expect(fm.Aliases).toEqual(['#' + expected, 'Machine learning']);
    expect(changed.split('---')[2]).toBe(original.split('---')[2]);
    const index = buildIndex([pageFromFrontmatter('page.md', fm)]);
    expect(resolveAlias('ml/sub', index)?.target).toBe(expected + '/sub');
  });
  it('supports merged targets without losing their separate shortcuts', () => {
    const pages = ['a', 'b'].map(target => {
      const file = new File({}, target + '.md', [], true);
      const text = `---\naliases: ["#${target}"]\ntag-aliases: ["shortcut-${target}"]\n---\n`;
      const changed = file.replaceInFrontMatter(text, new Replacement(new Tag('a'), new Tag('b')));
      return pageFromFrontmatter(target + '.md', parse(changed.split('---')[1]));
    });
    const index = buildIndex(pages);
    expect(resolveAlias('shortcut-a', index)?.target).toBe('b');
    expect(resolveAlias('shortcut-b', index)?.target).toBe('b');
  });
});
