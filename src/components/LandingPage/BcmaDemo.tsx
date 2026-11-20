import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { QrCode } from '../Marketing/QrCode';

/**
 * The hero's live thing: a working miniature of a hacCare medication pass.
 * Scan the wristband, then pick one of two medication labels; the wrong dose
 * is caught, the right one ticks off the five rights. Patient is fictional.
 *
 * Rendered as an interface fragment (data-ui), so it keeps product borders.
 * Without JavaScript the prerendered panel still shows the order and the
 * five checks, and the buttons simply do nothing.
 */
type Step = 'start' | 'wristband' | 'wrong' | 'verified' | 'given';

const ORDER = { drug: 'Metoprolol', dose: '25 mg', route: 'PO', time: '09:00' };
const LABELS = [
  { id: 'wrong', text: 'Metoprolol 50 mg tablet', qr: 'med50' },
  { id: 'right', text: 'Metoprolol 25 mg tablet', qr: 'med25' },
] as const;
const RIGHTS = ['Patient', 'Medication', 'Dose', 'Route', 'Time'];

export const BcmaDemo: React.FC = () => {
  const [step, setStep] = useState<Step>('start');
  const [hint, setHint] = useState('');

  const scanWristband = () => {
    setHint('');
    if (step === 'start') setStep('wristband');
  };

  const scanLabel = (id: 'wrong' | 'right') => {
    if (step === 'start') {
      setHint('Scan the wristband first. Patient before medication.');
      return;
    }
    if (step === 'given') return;
    setHint('');
    setStep(id === 'right' ? 'verified' : 'wrong');
  };

  const reset = () => { setStep('start'); setHint(''); };

  const patientOk = step !== 'start';
  const checked = step === 'verified' || step === 'given';

  return (
    <div data-ui className="bcma" aria-label="Try a medication pass">
      <div className="bcma__bar">
        <span>Medication pass</span>
        <span>Bed 4</span>
      </div>

      <div className="bcma__body">
        <div className="bcma__patient">
          <QrCode name="wristband" className="bcma__wrist-qr" />
          <div className="bcma__who">
            <p className="bcma__name">Morgan Lee</p>
            <p className="bcma__meta">DOB 1958-03-14 · No known allergies</p>
          </div>
          <button type="button" className={`bcma__scan ${patientOk ? 'is-done' : ''}`} onClick={scanWristband} disabled={patientOk}>
            {patientOk ? 'Wristband scanned' : 'Scan wristband'}
          </button>
        </div>

        <div className="bcma__order">
          <p className="bcma__label">Order due</p>
          <p className="bcma__drug">{ORDER.drug} {ORDER.dose} · {ORDER.route} · {ORDER.time}</p>
        </div>

        <p className="bcma__label">Scan a medication</p>
        <div className="bcma__labels">
          {LABELS.map(l => (
            <button
              key={l.id}
              type="button"
              className={`bcma__med ${step === 'wrong' && l.id === 'wrong' ? 'is-wrong' : ''} ${checked && l.id === 'right' ? 'is-right' : ''}`}
              onClick={() => scanLabel(l.id)}
              disabled={step === 'given'}
            >
              <QrCode name={l.qr} className="bcma__code" />
              {l.text}
            </button>
          ))}
        </div>

        <div className="bcma__status" role="status" aria-live="polite">
          {hint && <p className="bcma__alert">{hint}</p>}
          {step === 'wrong' && (
            <p className="bcma__alert">Dose doesn’t match the order ({ORDER.dose}). Don’t give it.</p>
          )}
          {step === 'start' && !hint && <p className="bcma__note">Try it: scan the wristband, then a label.</p>}
          {step === 'wristband' && <p className="bcma__note">Patient confirmed. Now scan the medication.</p>}
        </div>

        <ul className="bcma__rights" aria-label="The five rights">
          {RIGHTS.map(r => {
            const ok = checked || (r === 'Patient' && patientOk);
            return (
              <li key={r} className={ok ? 'is-ok' : ''}>
                <span aria-hidden="true">{ok && <Check size={13} strokeWidth={3} />}</span>
                {r}
                <span className="site-sr">{ok ? ' verified' : ' not yet verified'}</span>
              </li>
            );
          })}
        </ul>

        <div className="bcma__actions">
          {step === 'verified' && (
            <button type="button" className="bcma__give" onClick={() => setStep('given')}>Give and document</button>
          )}
          {step === 'given' && <p className="bcma__done">Given at 09:02 and documented in the MAR.</p>}
          {step !== 'start' && (
            <button type="button" className="bcma__reset" onClick={reset}>Start again</button>
          )}
        </div>
      </div>
    </div>
  );
};
