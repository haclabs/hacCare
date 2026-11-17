import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './site.css';
import './marketing.css';
import { SiteNav } from './SiteNav';
import { MarketingFooter } from './MarketingFooter';
import { useSiteMotion } from './useSiteMotion';
import { MARKETING_PAGES } from './pages';
import type { MarketingPageContent } from './types';

/**
 * Renders one marketing page from its content, in the public-site system:
 * headline on the ground, a wristband-shaped photo, highlights as a list in
 * large type, plain sections, a closing field in brand teal.
 */
export const MarketingPageView: React.FC<{ page: MarketingPageContent }> = ({ page }) => {
  const rootRef = useSiteMotion<HTMLDivElement>(page.path);

  useEffect(() => {
    document.title = page.title;
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <div className="site" ref={rootRef}>
      <SiteNav currentPath={page.path} />

      <main>
        <section className={`mpage__hero site-wrap ${page.image ? 'has-image' : ''}`}>
          <div className="mpage__intro">
            <h1 className="site-head mpage__title">{page.h1}</h1>
            <p className="site-lead mpage__lead">{page.lead}</p>
            <a href="/#contact" className="site-btn mpage__cta">Request a demo</a>
          </div>
          {page.image && (
            <figure className="mpage__figure">
              <div className="mpage__frame site-shutter">
                <img src={page.image.src} alt={page.image.alt} width={page.image.width} height={page.image.height} />
              </div>
              <figcaption className="site-small">{page.image.caption}</figcaption>
            </figure>
          )}
        </section>

        <section className="site-section site-wrap mpage__highlights" aria-label="In short">
          <ul>
            {page.highlights.map((h, i) => (
              <li key={h.title} data-reveal style={{ '--i': i } as React.CSSProperties}>
                <h2>{h.title}</h2>
                <p>{h.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {page.screenshot && (
          <section className="site-section" aria-label="In the product">
            <figure className="mpage__shot">
              <div className="mpage__shot-stage">
                <img
                  className="site-wipe"
                  src={page.screenshot.src}
                  alt={page.screenshot.alt}
                  width={page.screenshot.width}
                  height={page.screenshot.height}
                  loading="lazy"
                />
              </div>
              <figcaption className="site-wrap site-small">{page.screenshot.caption}</figcaption>
            </figure>
          </section>
        )}

        <div className="site-section site-wrap mpage__body">
          {page.sections.map(section => (
            <section key={section.heading} data-reveal>
              <h2>{section.heading}</h2>
              <div>
                {section.body.map(p => <p key={p}>{p}</p>)}
                {section.bullets && (
                  <ul className="mpage__bullets">
                    {section.bullets.map(b => <li key={b}>{b}</li>)}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>

        <section className="site-section">
          <div className="mpage__close">
            <div className="site-wrap mpage__close-inner">
              <div data-reveal>
                <h2 className="site-head">{page.ctaHeading}</h2>
                <p className="site-lead">{page.ctaBody}</p>
              </div>
              <a href="/#contact" className="site-btn site-btn--mint" data-reveal style={{ '--i': 1 } as React.CSSProperties}>
                Request a demo
              </a>
            </div>
          </div>
        </section>

        <nav className="site-section site-wrap mpage__related" aria-label="Related pages">
          <p className="mpage__related-head">Keep reading</p>
          <ul>
            {page.related.map((r, i) => {
              const target = MARKETING_PAGES.find(p => p.path === r.path);
              const pic = target?.screenshot;
              return (
                <li key={r.path} data-reveal style={{ '--i': i } as React.CSSProperties}>
                  <Link to={r.path} className="mpage__tile">
                    {pic && (
                      <span className="mpage__tile-pic">
                        <img src={pic.src} alt="" width={pic.width} height={pic.height} loading="lazy" />
                      </span>
                    )}
                    <span className="mpage__tile-label">{r.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </main>

      <MarketingFooter />
    </div>
  );
};
