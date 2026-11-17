import type { MarketingPageContent } from '../types';
import { BCMA_TRAINING, EDUCATORS, SIMULATION_LABS } from './solutions';
import { ABOUT, CANADIAN_SCHOOLS, SECURITY } from './trust';

/**
 * Every public marketing page, in footer order.
 *
 * Adding a page here wires it into routing (src/main.tsx), the prerender and
 * sitemap (scripts/prerender.mjs, via src/entry-server.tsx) and the footer.
 * It also needs a rewrite in netlify.toml — the build fails if it's missing.
 */
export const MARKETING_PAGES: MarketingPageContent[] = [
  BCMA_TRAINING,
  SIMULATION_LABS,
  EDUCATORS,
  CANADIAN_SCHOOLS,
  SECURITY,
  ABOUT,
];
