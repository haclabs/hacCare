import React from 'react';

interface ReadOnlyFieldProps {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}

export const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({ label, value, className = '' }) => (
  <div className={`border-l-4 border-teal-400 bg-teal-50/40 pl-4 py-2 rounded-r-md ${className}`}>
    <p className="text-xs font-medium text-teal-700 uppercase tracking-wide mb-0.5">{label}</p>
    <p className="text-sm text-gray-800">
      {value !== null && value !== undefined && value !== '' ? String(value) : (
        <span className="italic text-gray-400">—</span>
      )}
    </p>
  </div>
);
