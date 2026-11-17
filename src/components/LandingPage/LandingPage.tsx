import React, { useEffect } from 'react';
import '../Marketing/site.css';
import './landing.css';
import { SiteNav } from '../Marketing/SiteNav';
import { MarketingFooter } from '../Marketing/MarketingFooter';
import { useSiteMotion } from '../Marketing/useSiteMotion';
import { LandingHero } from './LandingHero';
import { ModuleShowcase } from './ModuleShowcase';
import { LabGallery } from './LabGallery';
import { CapabilityStatement } from './CapabilityStatement';
import { SimulationSteps } from './SimulationSteps';
import { CanadaPanel } from './CanadaPanel';
import { LandingFaq } from './LandingFaq';
import { ContactCoupon } from './ContactCoupon';

/**
 * Public home page. The order follows the argument:
 * what it is (live medication pass) → the whole shift → real labs →
 * what students do → how instructors run it → Canadian data and licence →
 * questions → book a demo.
 */
export const LandingPage: React.FC = () => {
  const rootRef = useSiteMotion<HTMLDivElement>('/');

  useEffect(() => {
    document.title = 'hacCare | Simulated EMR for Nursing & Healthcare Education';
  }, []);

  return (
    <div className="site" ref={rootRef}>
      <SiteNav />
      <main>
        <LandingHero />
        <ModuleShowcase />
        <LabGallery />
        <CapabilityStatement />
        <SimulationSteps />
        <CanadaPanel />
        <LandingFaq />
        <ContactCoupon />
      </main>
      <MarketingFooter />
    </div>
  );
};
