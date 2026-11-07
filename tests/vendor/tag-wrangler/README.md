# Upstream compatibility fixture

Unmodified `src/Tag.js`, `src/File.js`, and `LICENSE` from:
https://github.com/pjeby/tag-wrangler/tree/5930a24235d8290fb1eafb04938a882c201c3d1f

These files run only in tests. They are not included in the plugin bundle.
The integration tests use the real Tag Wrangler YAML rewrite code to test the
storage contract. They do not simulate its entire UI, file scan, or cancellation flow.
