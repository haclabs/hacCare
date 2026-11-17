/**
 * Public-page prerender script.
 *
 * Runs automatically after `vite build` via the package.json build script.
 * Without it every URL would return the same landing-page HTML, so crawlers
 * would see /privacy, /login and any mistyped URL as copies of the home page.
 *
 * Steps:
 *   1. SSR-build src/entry-server.tsx → dist-ssr/entry-server.js
 *   2. For each public route, write its own HTML file with its own title,
 *      description, canonical and robots tags (and a static body snapshot
 *      for pages that have indexable content)
 *   3. Write dist/404.html (static, no app bundle) and dist/sitemap.xml
 *   4. Delete the temporary dist-ssr folder
 *
 * Netlify serves an existing file before any non-forced rewrite, so
 * dist/privacy.html answers /privacy and dist/login.html answers /login.
 * Use <name>.html rather than <name>/index.html: the folder form makes
 * Netlify 301 /privacy to /privacy/.
 */
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');
const ssrOutDir = resolve(root, 'dist-ssr');
const SITE = 'https://haccare.app';

/**
 * Public routes. `render: true` injects a static snapshot of the page body;
 * otherwise the root stays empty and the client renders it.
 * `inSitemap` routes must also be `index`able.
 */
const ROUTES = [
  {
    path: '/',
    file: 'index.html',
    render: true,
    faqSchema: true,
    inSitemap: true,
    // Title and description come from index.html unchanged.
  },
  {
    path: '/privacy',
    file: 'privacy.html',
    render: true,
    inSitemap: true,
    title: 'Privacy Notice | hacCare',
    description:
      'How haclabs Inc. collects, uses and protects information in hacCare, the simulated EMR platform for healthcare education.',
  },
  {
    path: '/login',
    file: 'login.html',
    noindex: true,
    title: 'Sign in | hacCare',
    description: 'Sign in to hacCare.',
  },
  {
    path: '/set-password',
    file: 'set-password.html',
    noindex: true,
    title: 'Set your password | hacCare',
    description: 'Set your hacCare password.',
  },
];

const escapeAttr = (s) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Replace exactly one match, failing the build if index.html drifted. */
function replaceOnce(html, pattern, replacement, label) {
  const matches = html.match(new RegExp(pattern.source, 'g')) ?? [];
  if (matches.length !== 1) {
    throw new Error(`prerender: expected 1 match for ${label}, found ${matches.length}`);
  }
  return html.replace(pattern, replacement);
}

function applyHead(html, route) {
  const url = `${SITE}${route.path === '/' ? '/' : route.path}`;
  let out = html;

  if (route.title) {
    const t = escapeAttr(route.title);
    out = replaceOnce(out, /<title>[^<]*<\/title>/, `<title>${t}</title>`, 'title');
    out = replaceOnce(out, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${t}" />`, 'og:title');
    out = replaceOnce(out, /<meta property="twitter:title" content="[^"]*" \/>/, `<meta property="twitter:title" content="${t}" />`, 'twitter:title');
  }
  if (route.description) {
    const d = escapeAttr(route.description);
    out = replaceOnce(out, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${d}" />`, 'description');
    out = replaceOnce(out, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${d}" />`, 'og:description');
    out = replaceOnce(out, /<meta property="twitter:description" content="[^"]*" \/>/, `<meta property="twitter:description" content="${d}" />`, 'twitter:description');
  }

  out = replaceOnce(out, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`, 'canonical');
  out = replaceOnce(out, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`, 'og:url');
  out = replaceOnce(out, /<meta property="twitter:url" content="[^"]*" \/>/, `<meta property="twitter:url" content="${url}" />`, 'twitter:url');
  out = out.replace(/(<link rel="alternate" hreflang="(?:en|x-default)" href=")[^"]*(" \/>)/g, `$1${url}$2`);

  if (route.noindex) {
    out = replaceOnce(out, /<meta name="robots" content="[^"]*" \/>/, '<meta name="robots" content="noindex, follow" />', 'robots');
    out = out.replace(/\s*<meta name="(?:googlebot|bingbot)" content="[^"]*" \/>/g, '');
  }

  // Organization/SoftwareApplication schema describes the site, not each page:
  // keep it on the home page only.
  if (route.path !== '/') {
    out = replaceOnce(out, /\s*<!-- JSON-LD Structured Data -->\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, '', 'JSON-LD');
  }
  return out;
}

function faqJsonLd(faq) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE}/#faq`,
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
  // Escape "<" so answer text can never close the script element.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

const NOT_FOUND_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page not found | hacCare</title>
    <meta name="robots" content="noindex" />
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700&display=swap" rel="stylesheet" />
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
             background: #020617; color: #e2e8f0;
             font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
      main { max-width: 440px; text-align: center; }
      .wordmark { display: inline-block; margin-bottom: 40px; padding-left: 10px; border-left: 3px solid #3fbf9a;
                  font-family: Archivo, ui-sans-serif, system-ui, sans-serif; font-weight: 700; font-size: 30px;
                  line-height: 1; letter-spacing: -0.02em; color: #e2e8f0; text-decoration: none; }
      .wordmark span { color: #3fbf9a; }
      .code { font-size: 13px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #3fbf9a; }
      h1 { font-size: 28px; margin: 12px 0; color: #fff; }
      p { color: #94a3b8; line-height: 1.6; margin: 0 0 32px; }
      a.btn { display: inline-block; padding: 12px 22px; border-radius: 8px; background: #14776a; color: #fff;
              font-weight: 600; font-size: 14px; text-decoration: none; }
      a.btn:hover { background: #0f5c52; }
      a.btn:focus-visible { outline: 2px solid #3fbf9a; outline-offset: 3px; }
      .alt { display: block; margin-top: 18px; font-size: 14px; color: #94a3b8; }
      .alt a { color: #3fbf9a; }
    </style>
  </head>
  <body>
    <main>
      <a class="wordmark" href="/" aria-label="hacCare home">hac<span>Care</span></a>
      <div class="code">404</div>
      <h1>This page doesn’t exist</h1>
      <p>The link may be out of date, or the address may have a typo.</p>
      <a class="btn" href="/">Go to the hacCare home page</a>
      <span class="alt">Looking for your simulation? <a href="/login">Sign in</a></span>
    </main>
  </body>
</html>
`;

function sitemapXml(routes) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = routes
    .map((r) => `  <url>\n    <loc>${SITE}${r.path === '/' ? '/' : r.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// ── 1. SSR build ─────────────────────────────────────────────────────────────
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

const entryUrl = pathToFileURL(resolve(ssrOutDir, 'entry-server.js')).href;
const { render, LANDING_FAQ } = await import(/* @vite-ignore */ entryUrl);

// ── 2. Per-route HTML ────────────────────────────────────────────────────────
const template = readFileSync(resolve(distDir, 'index.html'), 'utf-8');
if (!template.includes('<div id="root"></div>')) {
  console.error('❌ Could not find <div id="root"></div> in dist/index.html — skipping prerender.');
  process.exit(1);
}

for (const route of ROUTES) {
  if (route.inSitemap && route.noindex) throw new Error(`prerender: ${route.path} is both noindex and in the sitemap`);

  let html = applyHead(template, route);
  if (route.faqSchema) {
    html = replaceOnce(html, /<\/head>/, `    ${faqJsonLd(LANDING_FAQ)}\n  </head>`, '</head>');
  }
  if (route.render) {
    html = html.replace('<div id="root"></div>', `<div id="root">${render(route.path)}</div>`);
  }
  writeFileSync(resolve(distDir, route.file), html);
  console.log(`📝 ${route.path.padEnd(14)} → dist/${route.file}${route.noindex ? '  (noindex)' : ''}`);
}

// ── 3. 404 page and sitemap ──────────────────────────────────────────────────
writeFileSync(resolve(distDir, '404.html'), NOT_FOUND_HTML);
writeFileSync(resolve(distDir, 'sitemap.xml'), sitemapXml(ROUTES.filter((r) => r.inSitemap)));
console.log('📝 404 page and sitemap.xml written');

// ── 4. Clean up temporary SSR build artefacts ────────────────────────────────
rmSync(ssrOutDir, { recursive: true, force: true });

console.log('✅ Prerender complete');
