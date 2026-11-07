# Tag Aliases for Obsidian

Use short names for long tags. Define `ml` as an alias for `topics/machine-learning`, type `#@ml`, and choose the suggestion to insert `#topics/machine-learning`.

- Nested paths work: `#@ml/models` inserts `#topics/machine-learning/models`.
- Multiple aliases can point to the same tag.
- Tag Wrangler renames keep alias targets current, including parent-tag renames.
- No network requests, telemetry, credentials, or runtime dependencies.
- Desktop and mobile-compatible public Obsidian APIs. Native testing has been completed on macOS; mobile testing is still pending.

## Install

Requires Obsidian 1.14.0 or later. This is a private plugin, not a community-directory listing.

1. Download `main.js` and `manifest.json` from this repository's latest release while signed into GitHub. Alternatively, download the `tag-aliases` artifact from a successful Actions run.
2. Put both files in `<vault>/.obsidian/plugins/tag-aliases/`.
3. Reload Obsidian, then enable **Tag Aliases** under **Settings → Community plugins**.
4. If desired, install **Tag Wrangler** from Obsidian's community directory. It is optional for alias insertion and required for automatic tag-rename integration.

For a local build, use Node.js 24 or later:

```sh
npm ci --ignore-scripts
npm run package
```

Copy the two files from `dist/tag-aliases/` into the vault plugin folder. `SHA256SUMS.txt` contains their checksums.

## Add and use aliases

Open **Tag Aliases: Edit tag aliases** from the command palette. Enter the canonical tag and one alias per line. You can also open the editor through the plugin settings or **Edit tag aliases** in Tag Wrangler's tag context menu.

Saving replaces this tag's current alias list. To remove all aliases, open its existing entry from settings and clear the list. The tag page and its other content are retained.

Type `#@` followed by an alias in the Markdown editor, then choose a suggestion. The `@` is removed when the canonical tag is inserted. The separate prefix avoids a conflict with Obsidian's built-in `#` completion. Unselected `#@...` text is not a real tag.

The **Tag Aliases: Insert tag by alias** command provides a searchable picker for registered aliases. You can assign it a hotkey in Obsidian. Use autocomplete to insert new nested suffixes.

This plugin supplies insertion shortcuts. It does not change the appearance of existing tags, extend core search, or rewrite tags already in your notes. Once inserted, tags work with core search, properties, and other plugins as normal canonical tags. Autocomplete is for the Markdown editor, not the Properties tag-input widget. It may also appear in code blocks; it only changes text when you select a suggestion.

## Storage and Tag Wrangler compatibility

Each canonical tag uses an ordinary Markdown tag page:

```yaml
---
aliases:
  - "#topics/machine-learning"
tag-aliases:
  - ml
  - machine-learning
---
```

The standard `aliases` property identifies the canonical tag. `tag-aliases` contains this plugin's shortcuts. [Tag Wrangler documents tag pages and automatically updates their tag aliases during renames](https://github.com/pjeby/tag-wrangler#tag-pages). The shortcut property remains unchanged, so the same shortcuts then point to the renamed tag.

The plugin reuses an existing tag page when it can identify exactly one. It supports Tag Wrangler's capitalized `Aliases` property and ordinary note aliases alongside the single `#tag`. If no page exists, it creates a root-level Markdown file with a generated filename. You can rename or move that file. Keep the two properties above intact.

Important behavior:

- Tags and aliases match without regard to letter case. The longest matching alias wins. Resolution performs one substitution; alias targets are never recursively resolved.
- Conflicting aliases that point to different tags are disabled and reported in settings. Fix their `tag-aliases` properties. Identical aliases pointing to the same tag are collapsed for insertion.
- A tag page must identify exactly one canonical `#tag`. Pages that identify several tags cannot define shortcuts unambiguously.
- A Tag Wrangler merge may leave multiple pages for one tag. Their shortcuts continue to resolve, but the editor refuses to choose a page arbitrarily. Consolidate the `tag-aliases` lists into one page and remove the merged `#tag` from the other pages' `aliases` properties.
- The rename must run through Tag Wrangler and include the alias page. Editing a tag manually in a note does not rename a tag page. A canceled or partial Tag Wrangler rename can leave notes and tag pages inconsistent; this plugin follows the tag page that exists. It does not guess rename intent.
- Upstream Tag Wrangler 0.6.5 can leave exact tag aliases unchanged if the rename source's casing differs from the stored alias. Use the stored casing for the rename and verify the tag page after a case-only change.
- Avoid concurrent edits to the same tag page across devices. Obsidian Sync handles these Markdown files like other notes; this plugin is not a distributed transaction system.
- The supported tag-name set is Unicode letters, combining marks, numbers, `_`, `-`, and `/`. Names cannot be entirely numeric, have empty path segments, or exceed 256 characters. Each page accepts up to 1,000 aliases; completion shows at most 50 matches.

## Validation

```sh
npm run check       # strict TypeScript, browser bundle, tests, coverage gates
npm audit           # dependency advisory check, including development tools
npm run package     # checks plus installable files and checksums
```

Tests cover validation, nested paths, duplicate/conflicting aliases, malformed properties, safe frontmatter edits, stale rename targets, editor insertion, UI callbacks, lifecycle registration, and upstream Tag Wrangler YAML rewrites. The upstream fixtures are pinned, licensed test inputs, excluded from the shipped plugin.

See [TESTING.md](TESTING.md) for native acceptance results and remaining test limits, and [SECURITY.md](SECURITY.md) for security boundaries.

The repository has no public distribution license. Upstream test fixtures retain their own license.
