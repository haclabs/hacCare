import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HacCareLogo } from '../Layout/HacCareLogo';
import { MarketingFooter } from './MarketingFooter';
import { MARKETING_PAGES } from './pages';
import type { MarketingPageContent } from './types';

const primaryBtn =
  'inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm text-white bg-haccare-teal hover:bg-haccare-teal-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-haccare-mint focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

/** Pages shown in the top nav, in order. The footer lists every page. */
const NAV_PATHS = ['/bcma-training', '/simulation-labs', '/educators', '/security'];

const MarketingNav: React.FC<{ currentPath: string }> = ({ currentPath }) => (
  <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
    <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16" aria-label="Main">
      <Link to="/" aria-label="hacCare home"><HacCareLogo variant="dark" size="30px" withBar /></Link>
      <div className="flex items-center gap-6 lg:gap-8">
        {MARKETING_PAGES.filter(p => NAV_PATHS.includes(p.path)).map(p => (
          <Link
            key={p.path}
            to={p.path}
            aria-current={p.path === currentPath ? 'page' : undefined}
            className={`hidden md:inline text-sm font-medium transition-colors ${
              p.path === currentPath ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {p.navLabel}
          </Link>
        ))}
        <Link to="/login" className="hidden sm:inline text-slate-300 hover:text-white text-sm font-medium transition-colors">
          Login
        </Link>
        <a href="/#contact" className={primaryBtn}>Request a demo</a>
      </div>
    </nav>
  </header>
);

/**
 * Renders one marketing page from its content. Typographic layout on purpose:
 * numbered highlights and plain sections rather than icon grids.
 */
export const MarketingPageView: React.FC<{ page: MarketingPageContent }> = ({ page }) => {
  useEffect(() => {
    document.title = page.title;
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <div className="min-h-screen bg-slate-950 text-white antialiased">
      <MarketingNav currentPath={page.path} />

      <main>
        {/* Hero */}
        <section className="px-4 pt-20 pb-16 md:pt-28 md:pb-20 border-b border-slate-800">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest text-haccare-mint mb-5">{page.eyebrow}</p>
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.08] tracking-tight mb-6">{page.h1}</h1>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl">{page.lead}</p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a href="/#contact" className={`${primaryBtn} px-7 py-3.5 text-base`}>
                Request a demo <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
              <a href="/#features" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                See the platform
              </a>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="px-4 py-16 bg-slate-900/40 border-b border-slate-800" aria-label="Highlights">
          <ol className="max-w-6xl mx-auto grid md:grid-cols-3 gap-px bg-slate-800 rounded-2xl overflow-hidden border border-slate-800">
            {page.highlights.map((h, i) => (
              <li key={h.title} className="bg-slate-950 p-8">
                <span className="block font-mono text-sm text-haccare-mint mb-4">{String(i + 1).padStart(2, '0')}</span>
                <h2 className="text-xl font-semibold mb-3">{h.title}</h2>
                <p className="text-slate-400 leading-relaxed">{h.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {page.image && (
          <figure className="px-4 pt-20 mx-auto" style={{ maxWidth: page.image.width + 32 }}>
            <img
              src={page.image.src}
              alt={page.image.alt}
              width={page.image.width}
              height={page.image.height}
              loading="lazy"
              className="w-full h-auto rounded-2xl border border-slate-800"
            />
            <figcaption className="mt-3 text-sm text-slate-500">{page.image.caption}</figcaption>
          </figure>
        )}

        {/* Body sections */}
        <div className="px-4 py-20">
          <div className="max-w-3xl mx-auto space-y-16">
            {page.sections.map(section => (
              <section key={section.heading}>
                <h2 className="text-2xl md:text-3xl font-bold mb-5">{section.heading}</h2>
                {section.body.map(p => (
                  <p key={p} className="text-slate-300 text-lg leading-relaxed mb-4">{p}</p>
                ))}
                {section.bullets && (
                  <ul className="mt-6 space-y-3 border-l-2 border-haccare-mint/40 pl-6">
                    {section.bullets.map(b => (
                      <li key={b} className="text-slate-300 leading-relaxed">{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>

        {/* Closing CTA */}
        <section className="px-4 pb-20">
          <div className="max-w-6xl mx-auto rounded-2xl border border-slate-700 bg-slate-900/60 p-10 md:p-14 md:flex md:items-center md:justify-between gap-10">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold mb-3">{page.ctaHeading}</h2>
              <p className="text-slate-400 text-lg leading-relaxed">{page.ctaBody}</p>
            </div>
            <a href="/#contact" className={`${primaryBtn} mt-8 md:mt-0 shrink-0 px-7 py-3.5 text-base`}>
              Request a demo <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* Related pages */}
        <nav className="px-4 pb-24" aria-label="Related pages">
          <div className="max-w-6xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-5">Keep reading</p>
            <ul className="grid sm:grid-cols-3 gap-4">
              {page.related.map(r => (
                <li key={r.path}>
                  <Link
                    to={r.path}
                    className="group flex items-center justify-between rounded-xl border border-slate-800 px-6 py-5 text-slate-200 hover:border-haccare-mint/50 hover:text-white transition-colors"
                  >
                    <span className="font-medium">{r.label}</span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-haccare-mint transition-colors" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </main>

      <MarketingFooter />
    </div>
  );
};
