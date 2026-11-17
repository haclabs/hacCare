import React, { useState } from 'react';
import { LANDING_FAQ } from './faqData';

/**
 * "Tabbed index cards": questions filed like cards in a drawer, each with a
 * tab on its top edge. One open at a time; the first is open on load.
 * Every answer is in the HTML (crawlable), and the FAQPage JSON-LD is built
 * from the same LANDING_FAQ data in scripts/prerender.mjs.
 */
export const LandingFaq: React.FC = () => {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="site-section faq" aria-labelledby="faq-title">
      <div className="site-wrap faq__inner">
        <h2 id="faq-title" className="site-head faq__title" data-reveal>Questions schools ask</h2>
        <div className="faq__stack">
          {LANDING_FAQ.map((item, i) => {
            const isOpen = i === open;
            const panelId = `faq-panel-${i}`;
            return (
              <div
                key={item.question}
                className={`faq__card faq__card--${i % 3} ${isOpen ? 'is-open' : ''}`}
                style={{ '--n': i, zIndex: i + 1 } as React.CSSProperties}
              >
                <span className="faq__tab" aria-hidden="true">{item.tab}</span>
                <h3>
                  <button
                    type="button"
                    className="faq__q"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(i)}
                  >
                    {item.question}
                  </button>
                </h3>
                <div id={panelId} className="faq__a" role="region" aria-label={item.question}>
                  <p>{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
