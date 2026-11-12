import React, { useEffect, useState } from 'react';
import { AlertCircle, KeyRound, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/api/supabase';
import { secureLogger } from '../../../lib/security/secureLogger';
import { browserSupportsPasskeys, describePasskeyError } from '../../../utils/passkeyErrors';

interface PasskeyItem {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
}

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : 'Never');

/**
 * Lets the signed-in user register and remove passkeys for passwordless sign-in.
 * Passkeys replace the password only — they do not satisfy MFA, so users with an
 * authenticator app are still asked for a code after signing in with a passkey.
 */
export const PasskeysCard: React.FC = () => {
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supported = browserSupportsPasskeys();

  const loadPasskeys = async () => {
    try {
      const { data, error: listError } = await supabase.auth.passkey.list();
      if (listError) throw listError;
      setPasskeys(data ?? []);
    } catch (err) {
      secureLogger.error('Error loading passkeys:', err);
      setError(describePasskeyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPasskeys();
  }, []);

  const handleAdd = async () => {
    setError('');
    setBusy(true);
    try {
      const { error: registerError } = await supabase.auth.registerPasskey();
      if (registerError) throw registerError;
      await loadPasskeys();
    } catch (err) {
      secureLogger.error('Error registering passkey:', err);
      setError(describePasskeyError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (passkey: PasskeyItem) => {
    const name = passkey.friendly_name || 'this passkey';
    if (!window.confirm(`Remove ${name}? You will no longer be able to sign in with it.`)) return;
    setError('');
    setBusy(true);
    try {
      const { error: deleteError } = await supabase.auth.passkey.delete({ passkeyId: passkey.id });
      if (deleteError) throw deleteError;
      setPasskeys(prev => prev.filter(p => p.id !== passkey.id));
    } catch (err) {
      secureLogger.error('Error removing passkey:', err);
      setError(describePasskeyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-2">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Passkeys</h2>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Sign in with Face ID, Touch ID, Windows Hello or a security key instead of your password.
        If you use two-factor authentication you will still be asked for your code.
      </p>

      {error && (
        <div className="mb-4 flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-300 text-xs">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-400">Checking…</p>
      ) : passkeys.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No passkeys yet.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {passkeys.map(passkey => (
            <li key={passkey.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{passkey.friendly_name || 'Passkey'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Added {formatDate(passkey.created_at)} · Last used {formatDate(passkey.last_used_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(passkey)}
                disabled={busy}
                aria-label={`Remove ${passkey.friendly_name || 'passkey'}`}
                className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {supported ? (
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy || loading}
          className="px-4 py-2 bg-haccare-teal hover:bg-haccare-teal-dark text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Waiting for passkey…' : 'Add a passkey'}
        </button>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">This browser does not support passkeys.</p>
      )}
    </div>
  );
};
