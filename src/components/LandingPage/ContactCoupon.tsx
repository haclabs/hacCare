import React, { useState } from 'react';

/**
 * "Clip-out coupon" contact form. Notches are wristband snap holes; the
 * perforation is a row of dots. Submits through the existing contact service.
 */
type FormStatus = { type: 'idle' | 'loading' | 'success' | 'error'; message?: string };

const EMPTY = { name: '', email: '', institution: '', message: '' };

export const ContactCoupon: React.FC = () => {
  const [formData, setFormData] = useState(EMPTY);
  const [status, setStatus] = useState<FormStatus>({ type: 'idle' });
  const busy = status.type === 'loading';

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const key = e.target.name as keyof typeof EMPTY;
    setFormData(prev => ({ ...prev, [key]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading' });
    const { submitContactForm } = await import('../../services/contact/contactService');
    const result = await submitContactForm(formData);
    if (result.success) {
      setStatus({ type: 'success', message: result.message || 'Thank you. We’ll be in touch soon.' });
      setFormData(EMPTY);
    } else {
      setStatus({ type: 'error', message: result.error || 'That didn’t send. Please try again, or email support@haccare.app.' });
    }
  };

  return (
    <section id="contact" className="site-section contact" aria-labelledby="contact-title">
      <div className="site-wrap">
        <div className="coupon" data-reveal>
          <div className="coupon__left">
            <h2 id="contact-title" className="coupon__title">Book a demo for your program</h2>
            <div>
              <p>Tell us how your program teaches documentation today. We’ll show you a full simulation, from build to debrief.</p>
              <p className="coupon__contact">
                <a className="site-link" href="mailto:support@haccare.app">support@haccare.app</a>
                <span>Lethbridge, Alberta</span>
              </p>
            </div>
          </div>
          <span className="coupon__perf" aria-hidden="true" />
          <form className="coupon__form" onSubmit={onSubmit}>
            <label className="site-sr" htmlFor="c-name">Name</label>
            <input id="c-name" name="name" required disabled={busy} placeholder="Your name" autoComplete="name" value={formData.name} onChange={onChange} />
            <label className="site-sr" htmlFor="c-email">Email</label>
            <input id="c-email" name="email" type="email" required disabled={busy} placeholder="you@institution.ca" autoComplete="email" value={formData.email} onChange={onChange} />
            <label className="site-sr" htmlFor="c-inst">Institution or program</label>
            <input id="c-inst" name="institution" disabled={busy} placeholder="Institution or program" autoComplete="organization" value={formData.institution} onChange={onChange} />
            <label className="site-sr" htmlFor="c-msg">Message</label>
            <textarea id="c-msg" name="message" required disabled={busy} rows={3} placeholder="What would you like to see?" value={formData.message} onChange={onChange} />
            <button type="submit" className="coupon__submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send request'}
            </button>
            <div role="status" aria-live="polite">
              {status.type === 'success' && <p className="coupon__msg">{status.message}</p>}
              {status.type === 'error' && <p className="coupon__msg coupon__msg--error">{status.message}</p>}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};
