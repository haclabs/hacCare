/**
 * Server-Side Render entry point for landing page prerendering.
 *
 * Used by scripts/prerender.mjs during the production build to inject
 * a static HTML snapshot of the landing page into dist/index.html so
 * that search-engine crawlers and social-media scrapers see real content
 * instead of an empty <div id="root">.
 *
 * Uses renderToStaticMarkup (no React hydration markers) because the
 * client uses createRoot (not hydrateRoot) — React replaces the DOM on
 * first render but the content is identical so users see no flash.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { LandingPage } from './components/LandingPage/LandingPage';

export function render(url: string): string {
  return renderToStaticMarkup(
    <StaticRouter location={url}>
      <LandingPage />
    </StaticRouter>
  );
}
