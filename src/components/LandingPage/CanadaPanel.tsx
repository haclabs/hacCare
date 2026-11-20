import React from 'react';
import { Link } from 'react-router-dom';

/** "Inset panel, shaped portrait": Canadian data, Canadian licence. */
export const CanadaPanel: React.FC = () => (
  <section id="canada" className="site-section" aria-labelledby="canada-title">
    <div className="canada">
      <div className="canada__left">
        <h2 id="canada-title" className="site-head canada__title" data-reveal>
          Built in Canada. <br />Stored in Canada.
        </h2>
        <div className="canada__photo site-wipe">
          <img
            src="/images/barcode-scanning.webp"
            alt="Student nurse scanning a patient wristband in a Canadian simulation lab"
            width={600}
            height={450}
            loading="lazy"
          />
        </div>
      </div>
      <div className="canada__right">
        <div data-reveal>
          <h3>Student data stays here</h3>
          <p>Student accounts and simulation records are stored in Canada. Every patient is fictional, and each institution is kept apart from every other.</p>
        </div>
        <div data-reveal style={{ '--i': 1 } as React.CSSProperties}>
          <h3>One licence, no access codes</h3>
          <p>hacCare is licensed to the institution for the academic year. Students never buy an access code, and everyone has access from the first class.</p>
        </div>
        <div className="canada__actions" data-reveal style={{ '--i': 2 } as React.CSSProperties}>
          <Link to="/security" className="site-btn site-btn--mint">Privacy and security</Link>
          <Link to="/canadian-nursing-schools" className="site-link">For Canadian schools</Link>
        </div>
      </div>
    </div>
  </section>
);
