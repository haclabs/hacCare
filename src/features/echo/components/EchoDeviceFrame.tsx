import React from 'react';
import { Maximize2, Smartphone } from 'lucide-react';
import { ECHO_PATH, setEchoFullWindow } from '../echoMode';

/**
 * Laptop preview: Echo runs in a phone-width iframe so its phone layout (which depends on
 * screen width) shows exactly as on the device. Same origin, so sign-in is shared.
 */
export const EchoDeviceFrame: React.FC = () => {
  const useFullWindow = () => {
    setEchoFullWindow(true);
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="rounded-[2.75rem] bg-gray-900 p-3 shadow-2xl">
        <iframe
          // Fixed path, never the current URL: a crafted path like //other.site/echo would
          // otherwise load another origin into the frame
          src={ECHO_PATH}
          title="Echo"
          allow="camera"
          className="block h-[min(844px,calc(100vh-7rem))] w-[390px] rounded-[2rem] bg-white"
        />
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
        <span className="flex items-center gap-1.5">
          <Smartphone className="h-4 w-4" />
          Phone preview
        </span>
        <button
          onClick={useFullWindow}
          className="flex items-center gap-1.5 rounded-lg border border-gray-400 dark:border-gray-600 px-3 py-1.5 font-medium hover:bg-white/60 dark:hover:bg-gray-700"
        >
          <Maximize2 className="h-4 w-4" />
          Use full window
        </button>
      </div>
    </div>
  );
};
