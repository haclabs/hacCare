import React from 'react';

type BadgeVariant = 'pre-filled' | 'template-only';

interface PreFilledBadgeProps {
  variant?: BadgeVariant;
  label?: string;
}

export const PreFilledBadge: React.FC<PreFilledBadgeProps> = ({
  variant = 'pre-filled',
  label,
}) => {
  if (variant === 'template-only') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        {label ?? 'Template — not used for this case'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
      {label ?? 'Pre-filled'}
    </span>
  );
};
