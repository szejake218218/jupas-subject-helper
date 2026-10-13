/* Builds a single self-contained HTML file into dist/ so the app can be shared
 * or previewed without a server (no fetch, no ES modules, no relative paths).
 * Run: node build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');

html = html.replace(
  /<link rel="stylesheet" href="([^"]+)">/g,
  (_, href) => `<style>\n${read(href)}\n</style>`
);

html = html.replace(
  /<script src="([^"]+)"><\/script>/g,
  (_, src) => `<script>\n/* ==== ${src} ==== */\n${read(src)}\n</script>`
);

// Fail loudly rather than shipping a page that silently lost an asset.
for (const marker of ['src="js/', 'href="css/']) {
  if (html.includes(marker)) throw new Error(`inlining incomplete: ${marker} still present`);
}

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'jupas-mvp-standalone.html');
fs.writeFileSync(out, html, 'utf8');
console.log(`built ${out} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
