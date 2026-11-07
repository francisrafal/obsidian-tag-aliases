# Test evidence

## Automated checks

Initial verification: 2026-11-07, macOS, Node.js 26.12.1.

- 66 passing tests across four suites.
- 99.4% source line coverage; 95.19% branch coverage.
- Strict TypeScript and a browser-targeted CommonJS build passed.
- npm audit reported zero known vulnerabilities, including development dependencies.
- Tests use a small Obsidian API double for lifecycle and UI behavior.
- Seven upstream compatibility cases execute unmodified Tag Wrangler `File` and `Replacement` code from commit `5930a24235d8290fb1eafb04938a882c201c3d1f`.

## Native acceptance

Tested in a new, isolated vault on macOS with Obsidian 1.14.5 and Tag Wrangler 0.6.5. No personal vault was used.

Completed:

1. Enabled the plugin and verified the settings list displayed `ml → topics/ml`.
2. Opened the alias editor, added `machine-learning`, saved, and read back the Markdown page. Both shortcuts persisted; the body remained intact.
3. Typed `#@ml/models`, observed the suggestion, and selected it. The note contained `#topics/ml/models`.
4. Enabled Tag Wrangler and verified its tag context menu included **Edit tag aliases**.
5. Used Tag Wrangler to rename parent tag `topics` to `research`. It reported two files updated. The existing nested tag became `#research/ml/models`.
6. Typed `#@ml/new` without reloading the plugin. The suggestion resolved to `#research/ml/new`, and selecting it inserted that tag.

## Limits and future checks

Mobile, Windows, Linux desktop, large-vault performance, and real multi-device sync have not been tested natively. Automated tests cover merge behavior and stale edits; native acceptance above did not exercise every Tag Wrangler cancellation or merge dialog. Minimum-version support follows the declared API baseline; native testing used 1.14.5.

For future releases, repeat the native acceptance steps, then test a direct child rename, a merge into an existing tag, duplicate-alias recovery, deleting and moving a tag page, disabling/re-enabling the plugin, and command insertion with selected text. Keep all such tests in a disposable vault.
