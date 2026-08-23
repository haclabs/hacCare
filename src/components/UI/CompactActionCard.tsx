import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface CompactActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Subtle highlight for the currently selected card (e.g. active dashboard module). */
  active?: boolean;
  /** w-52 flex-shrink-0 (horizontal scroll strips) vs w-full (grid). Default: full width. */
  fullWidth?: boolean;
  /** Rendered top-right next to the title — badge, "SOON" pill, arrow icon, etc. */
  rightSlot?: React.ReactNode;
}

/**
 * Shared compact card shell used for every clinical module / flowsheet link
 * across the app (patient dashboard tiles + Clinical Flowsheets Hub cards),
 * so the same link always looks the same regardless of where it's accessed from.
 */
export const CompactActionCard: React.FC<CompactActionCardProps> = ({
  icon: Icon,
  title,
  description,
  iconBg,
  iconColor,
  onClick,
  disabled = false,
  active = false,
  fullWidth = true,
  rightSlot,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'group relative text-left rounded-xl bg-white',
        'border p-3.5 shadow-sm transition-all duration-150',
        fullWidth ? 'w-full' : 'flex-shrink-0 w-52',
        active ? 'border-gray-400 shadow-md' : 'border-gray-200',
        disabled
          ? 'opacity-55 cursor-not-allowed'
          : 'cursor-pointer hover:border-gray-300 hover:shadow-md hover:-translate-y-px',
      ].join(' ')}
    >
      {/* Top row: icon + title + badge/arrow */}
      <div className="flex items-start gap-2.5">
        <div className={`flex-shrink-0 p-1.5 rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
              {title}
            </h3>
            {rightSlot}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2.5 text-[11px] text-gray-500 leading-relaxed line-clamp-2">
        {description}
      </p>
    </button>
  );
};

export default CompactActionCard;
