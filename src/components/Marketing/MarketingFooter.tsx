import React from 'react';
import { Link } from 'react-router-dom';
import { HacCareLogo } from '../Layout/HacCareLogo';
import { MARKETING_PAGES } from './pages';

const linkCls = 'text-slate-400 hover:text-white text-sm transition-colors';
const headingCls = 'text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4';

/**
 * Site footer shared by the landing page and every marketing page.
 * Home-page sections use plain "/#id" anchors: on the home page the browser
 * just scrolls; elsewhere it navigates home and jumps to the section.
 */
export const MarketingFooter: React.FC = () => (
  <footer className="border-t border-slate-800 bg-slate-950 py-14 px-4">
    <div className="max-w-7xl mx-auto">
      <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-10 mb-12">
        <div className="sm:col-span-2">
          <div className="mb-4">
            <Link to="/" aria-label="hacCare home">
              <HacCareLogo variant="dark" size="26px" withBar />
            </Link>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            A high-fidelity simulated EMR platform for healthcare education. Built in Lethbridge, Alberta. A haclabs product.
          </p>
        </div>
        <nav aria-label="Platform">
          <div className={headingCls}>Platform</div>
          <ul className="space-y-2.5">
            {[
              ['Features', '/#features'],
              ['Simulation', '/#simulation'],
              ['FAQ', '/#faq'],
              ['Request Access', '/#contact'],
            ].map(([label, href]) => (
              <li key={href}><a href={href} className={linkCls}>{label}</a></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Solutions">
          <div className={headingCls}>Solutions</div>
          <ul className="space-y-2.5">
            {MARKETING_PAGES.map(page => (
              <li key={page.path}><Link to={page.path} className={linkCls}>{page.navLabel}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Account">
          <div className={headingCls}>Account</div>
          <ul className="space-y-2.5">
            <li><Link to="/login" className={linkCls}>Login</Link></li>
            <li><Link to="/privacy" className={linkCls}>Privacy</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} hacCare. A haclabs product. All rights reserved.</p>
        <p className="text-slate-500 text-xs">Lethbridge, Alberta, Canada</p>
      </div>
    </div>
  </footer>
);
