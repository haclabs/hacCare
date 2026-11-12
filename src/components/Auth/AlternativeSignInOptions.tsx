import React from 'react';
import { KeyRound } from 'lucide-react';
import { browserSupportsPasskeys } from '../../utils/passkeyErrors';

interface AlternativeSignInOptionsProps {
  disabled: boolean;
  oauthLoading: boolean;
  passkeyLoading: boolean;
  onMicrosoftSignIn: () => void;
  onPasskeySignIn: () => void;
}

const buttonClass =
  'w-full bg-slate-800 border border-slate-700 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-700 hover:border-slate-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2';

/** Non-password sign-in buttons shown below the login form. */
export const AlternativeSignInOptions: React.FC<AlternativeSignInOptionsProps> = ({
  disabled,
  oauthLoading,
  passkeyLoading,
  onMicrosoftSignIn,
  onPasskeySignIn,
}) => (
  <>
    <div className="mt-6 mb-6 flex items-center">
      <div className="flex-1 border-t border-slate-700"></div>
      <span className="px-4 text-sm text-slate-500">or</span>
      <div className="flex-1 border-t border-slate-700"></div>
    </div>

    <button type="button" onClick={onMicrosoftSignIn} disabled={disabled} className={buttonClass}>
      <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
        <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
        <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
        <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
      </svg>
      <span>{oauthLoading ? 'Redirecting...' : 'Sign in with Microsoft'}</span>
    </button>

    {browserSupportsPasskeys() && (
      <button type="button" onClick={onPasskeySignIn} disabled={disabled} className={`mt-3 ${buttonClass}`}>
        <KeyRound className="h-5 w-5 text-[#3fbf9a]" />
        <span>{passkeyLoading ? 'Waiting for passkey...' : 'Sign in with a passkey'}</span>
      </button>
    )}
  </>
);
