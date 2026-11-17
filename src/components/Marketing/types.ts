/**
 * Content model for the public marketing pages (/bcma-training, /security, …).
 * Each page is plain data rendered by MarketingPageView, so copy can change
 * without touching layout code.
 *
 * Keep copy high-level: these pages are public. Describe what hacCare does
 * for a school, not how it is built.
 */
export interface MarketingHighlight {
  title: string;
  body: string;
}

export interface MarketingSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

export interface MarketingImage {
  /** Path under /public, e.g. "/images/nurse-scanning.webp". */
  src: string;
  alt: string;
  /** Intrinsic size, so the browser reserves space and nothing shifts. */
  width: number;
  height: number;
  caption: string;
}

export interface MarketingLink {
  path: string;
  label: string;
}

export interface MarketingPageContent {
  /** Route path, e.g. "/bcma-training". Also the prerendered file name. */
  path: string;
  /** Short label for nav and footer links. */
  navLabel: string;
  /** <title>; aim for 60 characters or fewer. */
  title: string;
  /** Meta description; aim for 155 characters or fewer. */
  description: string;
  eyebrow: string;
  h1: string;
  lead: string;
  highlights: MarketingHighlight[];
  /** Optional photo or screenshot shown after the highlights. */
  image?: MarketingImage;
  sections: MarketingSection[];
  ctaHeading: string;
  ctaBody: string;
  related: MarketingLink[];
}
