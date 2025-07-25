import React from 'react';
import { ConnectionDiagnostics } from './components/Settings/ConnectionDiagnostics';

/**
 * 🛡️ Security Diagnostics Demo
 * 
 * Demo page showcasing the new advanced security diagnostics
 * with AI-powered threat detection and PHI protection.
 */
const SecurityDiagnosticsDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🛡️ Advanced Security Diagnostics Demo
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Comprehensive security assessment with AI-powered threat detection and PHI protection
          </p>
        </div>

        {/* Connection Diagnostics with Security Integration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <ConnectionDiagnostics />
        </div>
      </div>
    </div>
  );
};

export default SecurityDiagnosticsDemo;
