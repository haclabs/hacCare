import React from 'react';
import { Link } from 'react-router-dom';
import { HacCareLogo } from '../Layout/HacCareLogo';

/** Plain bar: wordmark, four links, Login and one action. Shared by every public page. */
const LINKS: { href: string; label: string; route?: boolean }[] = [
  { href: '/#platform', label: 'Platform' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/security', label: 'Security', route: true },
  { href: '/#faq', label: 'FAQ' },
];

export const SiteNav: React.FC<{ currentPath?: string }> = ({ currentPath }) => (
  <header className="site-nav">
    <nav className="site-wrap site-nav__row" aria-label="Main">
      <Link to="/" aria-label="hacCare home" style={{ textDecoration: 'none' }}>
        <HacCareLogo variant="light" size="28px" withBar />
      </Link>
      <div className="site-nav__links">
        {LINKS.map(l =>
          l.route ? (
            <Link key={l.href} to={l.href} className="site-nav__hide-sm" aria-current={currentPath === l.href ? 'page' : undefined}>
              {l.label}
            </Link>
          ) : (
            <a key={l.href} href={l.href} className="site-nav__hide-sm">{l.label}</a>
          ),
        )}
        <Link to="/login">Login</Link>
        <a href="/#contact" className="site-btn site-btn--small">Request a demo</a>
      </div>
    </nav>
  </header>
);
