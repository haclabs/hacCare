import React, { useState } from 'react';
import { ScanLine, X } from 'lucide-react';
import {
  ROVER_PATH,
  dismissRoverSuggestion,
  isLikelyHandheld,
  isRoverSuggestionDismissed,
} from '../roverMode';

/** Offers Rover mode to touch-only devices (tablets/phones) using the full desktop layout. */
export const RoverModeSuggestion: React.FC = () => {
  const [visible, setVisible] = useState(() => isLikelyHandheld() && !isRoverSuggestionDismissed());
  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 border-b border-teal-200 bg-teal-50 px-8 pl-16 py-3 text-sm text-teal-900">
      <ScanLine className="h-5 w-5 shrink-0 text-haccare-teal" />
      <p className="flex-1">
        <span className="font-semibold">Using a tablet at the bedside?</span> Rover mode shows just your
        simulations and the MAR, sized for touch and barcode scanning.
      </p>
      <button
        onClick={() => {
          window.location.assign(ROVER_PATH);
        }}
        className="rounded-lg bg-haccare-teal px-4 py-2 font-semibold text-white hover:bg-haccare-teal-dark"
      >
        Switch to Rover mode
      </button>
      <button
        onClick={() => {
          dismissRoverSuggestion();
          setVisible(false);
        }}
        className="rounded-lg p-2 text-teal-800 hover:bg-teal-100"
        aria-label="Dismiss Rover mode suggestion"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
