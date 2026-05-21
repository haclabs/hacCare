/**
 * FlowsheetFormSection
 *
 * A labelled card wrapper used to group related fields within every native
 * flowsheet form. Keeping this shared ensures all 21 forms have a consistent
 * visual hierarchy without each form re-implementing the same shell.
 *
 * Usage:
 *   <FlowsheetFormSection title="Pain Characteristics" description="Optional subtitle">
 *     <label>…</label>
 *     <input … />
 *   </FlowsheetFormSection>
 */

import React from 'react';

interface FlowsheetFormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const FlowsheetFormSection: React.FC<FlowsheetFormSectionProps> = ({
  title,
  description,
  children,
}) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {description && (
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      )}
    </div>
    <div className="px-5 py-4 space-y-4">{children}</div>
  </div>
);
