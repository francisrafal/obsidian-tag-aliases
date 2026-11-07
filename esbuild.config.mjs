import { build } from 'esbuild';
const result = await build({
  entryPoints: ['src/main.ts'], bundle: true, external: ['obsidian'],
  format: 'cjs', target: 'es2022', platform: 'browser', outfile: 'main.js',
  sourcemap: false, minify: false, metafile: true,
  banner: { js: '/* Tag Aliases - no network access or runtime dependencies. */' }
});

for (const output of Object.values(result.metafile.outputs)) {
  for (const dependency of output.imports) {
    if (dependency.path !== 'obsidian') throw new Error(`Unexpected runtime dependency: ${dependency.path}`);
  }
}
for (const input of Object.keys(result.metafile.inputs)) {
  if (!input.startsWith('src/')) throw new Error(`Unexpected bundled input: ${input}`);
}
