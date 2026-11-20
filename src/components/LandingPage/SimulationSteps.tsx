import React from 'react';

/**
 * "One card, four fields": the same simulation card, further along in each
 * field, from template to debrief. Cards are interface fragments (data-ui).
 */
const FIELDS = [
  {
    clause: 'First, build the patient once.',
    status: 'Template',
    rows: [['Patient', 'Morgan Lee, 67'], ['Orders', '6 medications, 2 labs']],
  },
  {
    clause: 'Then launch it for a group.',
    status: 'Launched',
    rows: [['Group', '6 students'], ['QR labels', 'Printed']],
  },
  {
    clause: 'Students work the shift.',
    status: 'In progress',
    rows: [['Doses given', '4 of 6'], ['Vital signs', '3 sets']],
    progress: 4 / 6,
  },
  {
    clause: 'Reset, and debrief together.',
    status: 'Debrief ready',
    rows: [['Report', 'PDF, by student'], ['Next group', 'Reset done']],
    progress: 1,
  },
];

export const SimulationSteps: React.FC = () => (
  <section id="how-it-works" className="site-section steps" aria-labelledby="steps-title">
    <ol className="steps__row">
      {FIELDS.map((f, i) => (
        <li key={f.status} className={`steps__field steps__field--${i + 1}`}>
          {i === 0 && <h2 id="steps-title" className="steps__title">Run a simulation</h2>}
          <div className="simcard-wrap" data-reveal style={{ '--i': i } as React.CSSProperties}>
          <div data-ui className="simcard">
            <div className="simcard__top">
              <span className="simcard__name">Post-op day 1 · Bed 4</span>
              <span className={`simcard__status simcard__status--${i + 1}`}>{f.status}</span>
            </div>
            <dl className="simcard__rows">
              {f.rows.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {f.progress !== undefined && (
              <div className="simcard__progress" aria-hidden="true">
                <span style={{ transform: `scaleX(${f.progress})` }} />
              </div>
            )}
          </div>
          </div>
          <p className="steps__clause">{f.clause}</p>
        </li>
      ))}
    </ol>
  </section>
);
