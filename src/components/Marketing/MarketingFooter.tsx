import React from 'react';
import { Link } from 'react-router-dom';
import { MARKETING_PAGES } from './pages';

/** Letters of the block wordmark, each knocked out of its own band of colour. */
const BLOCKS = [
  { ch: 'h', h: 100, c: 'var(--accent)', ink: 'var(--ground)' },
  { ch: 'a', h: 72, c: 'var(--accent)', ink: 'var(--ground)' },
  { ch: 'c', h: 84, c: 'var(--accent)', ink: 'var(--ground)' },
  { ch: 'C', h: 100, c: 'var(--mint)', ink: 'var(--deep)' },
  { ch: 'a', h: 64, c: 'var(--mint)', ink: 'var(--deep)' },
  { ch: 'r', h: 78, c: 'var(--mint)', ink: 'var(--deep)' },
  { ch: 'e', h: 90, c: 'var(--mint)', ink: 'var(--deep)' },
];

/**
 * Site footer shared by the landing page and every marketing page: the name
 * built large from wristband-ended blocks, then plain link columns.
 * Home-page sections use "/#id" anchors so they work from any page.
 */
export const MarketingFooter: React.FC = () => (
  <footer className="footer">
    <div className="site-wrap">
      <Link to="/" className="footer__mark" aria-label="hacCare home">
        {BLOCKS.map((b, i) => (
          <span key={i} aria-hidden="true" style={{ height: `${b.h}%`, background: b.c, color: b.ink }}>{b.ch}</span>
        ))}
      </Link>

      <div className="footer__cols">
        <nav aria-label="Platform">
          <p className="footer__head">Platform</p>
          <ul>
            <li><a href="/#platform">Modules</a></li>
            <li><a href="/#how-it-works">How it works</a></li>
            <li><a href="/#faq">FAQ</a></li>
            <li><a href="/#contact">Request a demo</a></li>
          </ul>
        </nav>
        <nav aria-label="Solutions">
          <p className="footer__head">Solutions</p>
          <ul>
            {MARKETING_PAGES.map(p => (
              <li key={p.path}><Link to={p.path}>{p.navLabel}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Account">
          <p className="footer__head">Account</p>
          <ul>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/privacy">Privacy notice</Link></li>
          </ul>
        </nav>
        <div className="footer__contact">
          <p className="footer__head">Contact</p>
          <p><a href="mailto:support@haccare.app">support@haccare.app</a></p>
          <p>haclabs Inc.<br />Lethbridge, Alberta, Canada</p>
        </div>
      </div>

      <div className="footer__last">
        <p>&copy; {new Date().getFullYear()} haclabs Inc. hacCare is a haclabs product.</p>
        <a href="/#contact" className="site-btn site-btn--small site-btn--mint">Request a demo</a>
      </div>
    </div>
  </footer>
);
