/**
 * Mode Toggle - Switch between device and wound placement modes
 */

import React from 'react';
import { Droplet, Zap } from 'lucide-react';

interface ModeToggleProps {
  mode: 'device' | 'wound';
  onModeChange: (mode: 'device' | 'wound') => void;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onModeChange }) => {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1">
      <button
        onClick={() => onModeChange('device')}
        className={`
          px-4 py-2 rounded-md text-sm font-medium transition-all
          flex items-center space-x-2
          ${mode === 'device'
            ? 'bg-green-500 text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900'
          }
        `}
        aria-pressed={mode === 'device'}
      >
        <Droplet className="h-4 w-4" />
        <span>Add Device</span>
      </button>
      
      <button
        onClick={() => onModeChange('wound')}
        className={`
          px-4 py-2 rounded-md text-sm font-medium transition-all
          flex items-center space-x-2
          ${mode === 'wound'
            ? 'bg-pink-500 text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900'
          }
        `}
        aria-pressed={mode === 'wound'}
      >
        <Zap className="h-4 w-4" />
        <span>Add Wound/Incision</span>
      </button>
    </div>
  );
};
