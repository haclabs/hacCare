import React, { useState } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { getTenantById } from '../../services/admin/tenantService';

/**
 * Program Selector Modal
 * Shown to instructors with multiple program assignments on login
 * Allows them to select which program tenant workspace to enter
 */
export const ProgramSelectorModal: React.FC = () => {
  const { programTenants, currentTenant, loading } = useTenant();
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');

  // Don't show modal if:
  // 1. Still loading
  // 2. Already in a tenant
  // 3. No program tenants available
  // 4. Only one program tenant (auto-login handled by TenantContext)
  const shouldShow = !loading && !currentTenant && programTenants.length > 1;

  const handleSelectProgram = async (tenantId: string) => {
    setSelecting(true);
    setError('');

    try {
      // Get the tenant
      const { data: tenant, error: tenantError } = await getTenantById(tenantId);
      if (tenantError || !tenant) {
        throw new Error('Failed to load program tenant');
      }

      // Save preference to localStorage
      localStorage.setItem('current_program_tenant', tenantId);

      // Reload the page to trigger TenantContext to load the selected program tenant
      window.location.reload();
    } catch (err) {
      console.error('Error selecting program:', err);
      setError(err instanceof Error ? err.message : 'Failed to select program');
      setSelecting(false);
    }
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <BookOpen className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold">Select Your Program</h2>
          </div>
          <p className="text-blue-100">
            You're assigned to multiple programs. Choose which one you'd like to work in.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Program List */}
        <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
          {programTenants.map((program) => (
            <button
              key={program.tenant_id}
              onClick={() => handleSelectProgram(program.tenant_id)}
              disabled={selecting}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-700 rounded-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg text-white font-bold text-lg">
                  {program.program_code.substring(0, 2)}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {program.program_name}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                      {program.program_code}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {program.tenant_name}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            You can switch programs later from the header menu
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProgramSelectorModal;
