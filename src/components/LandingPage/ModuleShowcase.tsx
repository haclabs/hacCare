import React, { useState } from 'react';

/**
 * "Object on a disc", with the disc swapped for the wristband band: a list of
 * modules on the left; the chosen one's real screenshot stands on a band
 * whose colour changes with it.
 */
const MODULES = [
  {
    name: 'Medication pass',
    fact: 'Dual-scan BCMA against a live MAR, with the five rights checked on every dose.',
    src: '/images/bcma.webp', w: 1009, h: 639,
    alt: 'hacCare BCMA screen confirming the five rights before a dose is given',
    band: 'var(--mint)',
  },
  {
    name: 'Medication record',
    fact: 'Scheduled, PRN and continuous medications in one record, with overdue doses flagged.',
    src: '/images/barcode_med_admin.jpg', w: 672, h: 310,
    alt: 'hacCare medication administration record listing PRN and scheduled medications',
    band: 'var(--mint-pale)',
  },
  {
    name: 'Body assessment',
    fact: 'Tap the body diagram to place wounds, devices and findings, then track them over time.',
    src: '/images/body-front.png', w: 200, h: 400,
    alt: 'Front body diagram used to document wound and device locations',
    band: 'var(--accent)',
  },
  {
    name: 'Scenario templates',
    fact: 'Build a patient once, with history, medications, orders and labs, and reuse it every term.',
    src: '/images/template.webp', w: 488, h: 329,
    alt: 'Simulation template cards with program tags in hacCare',
    band: 'var(--surface)',
  },
  {
    name: 'Debrief reports',
    fact: 'Every scan, vital sign and note, by student and by time, exported as a PDF.',
    src: '/images/debrief.webp', w: 488, h: 329,
    alt: 'Debrief report showing each student’s documented activity',
    band: 'var(--mint)',
  },
];

export const ModuleShowcase: React.FC = () => {
  const [active, setActive] = useState(0);

  return (
    <section id="platform" className="site-section showcase" aria-labelledby="showcase-title">
      <div className="site-wrap showcase__grid">
        <div className="showcase__stage" aria-live="polite">
          <div className="showcase__band" style={{ background: MODULES[active].band }} />
          {MODULES.map((m, i) => (
            <img
              key={m.name}
              src={m.src}
              alt={i === active ? m.alt : ''}
              aria-hidden={i !== active}
              width={m.w}
              height={m.h}
              loading="lazy"
              className={`showcase__object ${m.h > m.w ? 'is-tall' : ''} ${i === active ? 'is-active' : ''}`}
            />
          ))}
          <p className="showcase__fact">{MODULES[active].fact}</p>
        </div>

        <div className="showcase__list">
          <h2 id="showcase-title" className="showcase__title" data-reveal>One chart for the whole shift</h2>
          <ul role="tablist" aria-label="hacCare modules" aria-orientation="vertical">
            {MODULES.map((m, i) => (
              <li key={m.name} data-reveal style={{ '--i': i + 1 } as React.CSSProperties}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  className={`showcase__item ${i === active ? 'is-active' : ''}`}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                >
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
