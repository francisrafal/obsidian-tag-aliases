# Security

## Runtime behavior

The shipped plugin has no network calls, telemetry, dynamic code execution, Node.js filesystem access, subprocess calls, or external runtime dependencies. Its only external import is Obsidian. It uses public Obsidian APIs; it does not patch Tag Wrangler, core search, or editor internals.

It reads metadata for Markdown files in the current vault. On an explicit save, it creates a new tag page or updates only the `tag-aliases` property on an existing page through `processFrontMatter`. Obsidian may reserialize frontmatter formatting. It never performs bulk note rewrites. Insertion changes only the selected editor range.

User-controlled strings are rendered as text, not HTML. Tag names are validated. Generated filenames contain no user input, and Vault.create refuses to overwrite an existing file. Maps hold alias lookup data, including keys such as `__proto__`. Conflicting mappings fail closed. The editor rechecks the target during an existing-page write and refuses stale tag-page identities.

Obsidian plugins run with the host application's privileges. This plugin is not sandboxed from other installed plugins. Other software or vault sync can change its Markdown data. The checks above reduce accidental writes; they cannot prevent all external concurrent changes or failures in Obsidian or Tag Wrangler.

## Build and dependency controls

All direct development dependencies are pinned, with a committed lockfile. Install with `npm ci --ignore-scripts`. CI has read-only repository permissions, disables persisted checkout credentials, pins actions by commit, runs strict TypeScript and coverage gates, and checks npm advisories. Dependabot checks npm and action updates weekly. The package includes only the compiled plugin, manifest, and checksums.

No security audit can prove the absence of defects. Dependency scan results describe the advisories known at the time of the scan.

## Reporting

Report concerns to the repository owner through a private GitHub channel. Do not include vault contents, tokens, or other secrets in issues or test fixtures. Provide a minimal synthetic reproduction when possible.
