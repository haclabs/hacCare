import React from 'react';
import { ChevronRight } from 'lucide-react';
import { LANDING_FAQ } from './faqData';

/**
 * Visible FAQ section. Uses native <details> so every answer is in the
 * prerendered HTML (crawlable) and works without JavaScript or extra state.
 * The FAQPage JSON-LD is generated from the same LANDING_FAQ data.
 */
export const LandingFaq: React.FC = () => (
  <section id="faq" className="py-24 px-4">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-4xl font-bold text-white mb-10 text-center">Frequently Asked Questions</h2>
      <div className="space-y-3">
        {LANDING_FAQ.map(item => (
          <details
            key={item.question}
            className="group rounded-xl border border-slate-700 bg-slate-800/30 open:border-emerald-500/30 transition-colors"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3fbf9a] rounded-xl">
              <h3 className="text-base">{item.question}</h3>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-90" aria-hidden="true" />
            </summary>
            <p className="px-6 pb-5 text-slate-400 leading-relaxed">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);
