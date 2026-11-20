import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, KeyRound, X } from 'lucide-react';
import { supabase } from '../../../lib/api/supabase';
import { secureLogger } from '../../../lib/security/secureLogger';
import { describePasskeyError } from '../../../utils/passkeyErrors';

interface PasskeySetupPromptProps {
  onNotNow: () => void;
  onNeverAsk: () => void;
  onDone: () => void;
}

/** Post-login nudge for instructors and above to register a passkey. */
export const PasskeySetupPrompt: React.FC<PasskeySetupPromptProps> = ({ onNotNow, onNeverAsk, onDone }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onNotNow();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [busy, onNotNow]);

  const handleSetup = async () => {
    setError('');
    setBusy(true);
    try {
      const { error: registerError } = await supabase.auth.registerPasskey();
      if (registerError) throw registerError;
      setRegistered(true);
    } catch (err) {
      secureLogger.error('Error registering passkey from login prompt:', err);
      setError(describePasskeyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="passkey-prompt-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-md overflow-hidden">
        <div className="flex items-start justify-between px-6 pt-6">
          <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-xl">
            <KeyRound className="h-6 w-6 text-haccare-teal" />
          </div>
          {!registered && (
            <button
              onClick={onNotNow}
              disabled={busy}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              aria-label="Not now"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="px-6 py-4">
          {registered ? (
            <>
              <h2 id="passkey-prompt-title" className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Passkey added
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Next time, choose <span className="font-medium">Sign in with a passkey</span> on the login page.
                You can manage passkeys any time under Settings.
              </p>
            </>
          ) : (
            <>
              <h2 id="passkey-prompt-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Sign in faster with a passkey
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Use your fingerprint, face, or device PIN instead of typing your password. Passkeys can't be
                phished or reused, and you can remove them any time under Settings.
              </p>
            </>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
          {registered ? (
            <button
              onClick={onDone}
              className="ml-auto px-4 py-2 text-sm font-medium bg-haccare-teal hover:bg-haccare-teal-dark text-white rounded-lg"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onNeverAsk}
                disabled={busy}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
              >
                Don't ask again
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={onNotNow}
                  disabled={busy}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Not now
                </button>
                <button
                  onClick={handleSetup}
                  disabled={busy}
                  className="px-4 py-2 text-sm font-medium bg-haccare-teal hover:bg-haccare-teal-dark text-white rounded-lg disabled:opacity-50"
                >
                  {busy ? 'Waiting for passkey…' : 'Set up passkey'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasskeySetupPrompt;
