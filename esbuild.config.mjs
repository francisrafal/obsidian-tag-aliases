import { build } from 'esbuild';
await build({
  entryPoints: ['src/main.ts'], bundle: true, external: ['obsidian'],
  format: 'cjs', target: 'es2022', platform: 'browser', outfile: 'main.js',
  sourcemap: false, minify: false,
  banner: { js: '/* Tag Aliases - no network access or runtime dependencies. */' }
});
