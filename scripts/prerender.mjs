/**
 * Landing page prerender script.
 *
 * Runs automatically after `vite build` via the package.json build script.
 * Produces a static HTML snapshot of the landing page and injects it into
 * dist/index.html so search-engine crawlers see real content.
 *
 * Steps:
 *   1. SSR-build src/entry-server.tsx → dist-ssr/entry-server.js
 *   2. Call render('/') to get the landing page HTML string
 *   3. Replace <div id="root"></div> in dist/index.html with the rendered HTML
 *   4. Delete the temporary dist-ssr folder
 */
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const ssrOutDir = resolve(root, 'dist-ssr');

console.log('🔨 Building SSR entry for prerender...');

await build({
  root,
  // Use a clean inline config to avoid conflicts with the browser build config
  // (especially rollupOptions.input which is set to index.html there).
  configFile: false,
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(root, './src') },
  },
  build: {
    ssr: 'src/entry-server.tsx',
    outDir: ssrOutDir,
    emptyOutDir: true,
    rollupOptions: {
      output: { format: 'esm' },
    },
  },
  logLevel: 'warn',
});

console.log('📝 Rendering landing page HTML...');

const entryUrl = pathToFileURL(resolve(ssrOutDir, 'entry-server.js')).href;
const { render } = await import(/* @vite-ignore */ entryUrl);

const appHtml = render('/');

const indexPath = resolve(root, 'dist/index.html');
let template = readFileSync(indexPath, 'utf-8');

if (!template.includes('<div id="root"></div>')) {
  console.error('❌ Could not find <div id="root"></div> in dist/index.html — skipping prerender.');
  process.exit(1);
}

template = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
writeFileSync(indexPath, template);

// Clean up temporary SSR build artefacts
rmSync(ssrOutDir, { recursive: true, force: true });

console.log('✅ Prerender complete — dist/index.html updated with static landing page HTML');
