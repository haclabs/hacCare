import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ChevronLeft } from 'lucide-react';
import { PrivacyContent } from './PrivacyContent';

const logo = '/images/logo.svg';

/**
 * Standalone public privacy policy page — accessible at /privacy without login.
 * URL: https://haccare.app/privacy
 */
export const PrivacyPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col">
    {/* Minimal header */}
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="hacCare" className="h-8 w-auto" />
          <span className="text-gray-400 text-sm">|</span>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Privacy Notice</span>
          </div>
        </div>
        <Link
          to="/login"
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </header>

    {/* Content */}
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
          <Shield className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <h1 className="text-xl font-bold text-gray-900">Privacy Notice</h1>
        </div>
        <PrivacyContent />
      </div>
    </main>

    <footer className="text-center text-xs text-gray-400 pb-8">
      © {new Date().getFullYear()} haclabs Inc. &nbsp;·&nbsp;
      <a href="mailto:privacy@haclabs.io" className="hover:text-gray-600 transition-colors">
        privacy@haclabs.io
      </a>
    </footer>
  </div>
);
