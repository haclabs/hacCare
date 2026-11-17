/**
 * Server-Side Render entry point for public-page prerendering.
 *
 * Used by scripts/prerender.mjs during the production build to write a static
 * HTML snapshot of each public page (/, /privacy) so search-engine crawlers
 * and social-media scrapers see real content instead of an empty <div id="root">.
 *
 * Uses renderToStaticMarkup (no React hydration markers) because the
 * client uses createRoot (not hydrateRoot) — React replaces the DOM on
 * first render but the content is identical so users see no flash.
 */
/* eslint-disable react-refresh/only-export-components -- SSR entry, never hot-reloaded */
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { LandingPage } from './components/LandingPage/LandingPage';
import { PrivacyPage } from './components/Auth/PrivacyPage';

export { LANDING_FAQ } from './components/LandingPage/faqData';

const PAGES: Record<string, () => ReactElement> = {
  '/': () => <LandingPage />,
  '/privacy': () => <PrivacyPage />,
};

export function render(url: string): string {
  const page = PAGES[url];
  if (!page) throw new Error(`No prerender page registered for ${url}`);
  return renderToStaticMarkup(<StaticRouter location={url}>{page()}</StaticRouter>);
}
