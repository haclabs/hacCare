import React from 'react';
import { Link } from 'react-router-dom';

/**
 * "Paragraph with picture words": one statement carries the feature list.
 * After each capability's noun sits a small real fragment: a photo crop or a
 * live-looking interface chip (data-ui).
 */
export const CapabilityStatement: React.FC = () => (
  <section className="site-section statement" aria-labelledby="statement-title">
    <h2 id="statement-title" className="site-sr">What students do in hacCare</h2>
    <div className="site-wrap">
      <p className="statement__text" data-reveal>
        Students record vitals{' '}
        <span data-ui className="slot slot--chip" aria-hidden="true">BP 128/82</span>, action orders{' '}
        <span data-ui className="slot slot--chip slot--ok" aria-hidden="true">Done</span>, scan every dose{' '}
        <span className="slot" aria-hidden="true"><img src="/images/nurse-scanning.webp" alt="" width={600} height={450} loading="lazy" /></span>{' '}
        and chart on the body map{' '}
        <span className="slot slot--body" aria-hidden="true"><img src="/images/body-front.png" alt="" width={200} height={400} loading="lazy" /></span>.
      </p>
      <div className="statement__after" data-reveal style={{ '--i': 1 } as React.CSSProperties}>
        <p>Every action is timestamped and attributed to the student who did it, ready for the debrief.</p>
        <Link to="/simulation-labs" className="site-link">How simulation labs use it</Link>
      </div>
    </div>
  </section>
);
