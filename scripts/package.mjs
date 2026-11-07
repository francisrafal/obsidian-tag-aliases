import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const versions = JSON.parse(await readFile('versions.json', 'utf8'));
if (manifest.version !== pkg.version || versions[manifest.version] !== manifest.minAppVersion) {
  throw new Error('Package, manifest, and compatibility versions must agree.');
}
await mkdir('dist/tag-aliases', { recursive: true });
const checksums = [];
for (const file of ['main.js', 'manifest.json']) {
  await copyFile(file, `dist/tag-aliases/${file}`);
  checksums.push(`${createHash('sha256').update(await readFile(file)).digest('hex')}  ${file}`);
}
await writeFile('dist/tag-aliases/SHA256SUMS.txt', checksums.join('\n') + '\n');
console.log('Installable files and SHA-256 checksums written to dist/tag-aliases/.');
