import React, { useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/auth/AuthContext';

/**
 * Organization Switcher Component
 * Dropdown to switch between organizations (super admin only)
 */
export const OrganizationSwitcher: React.FC = () => {
  const { profile } = useAuth();
  const { 
    currentOrganization, 
    availableOrganizations, 
    switchOrganization, 
    canSwitchOrganizations 
  } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Only show for super admins
  if (!canSwitchOrganizations || !profile || profile.role !== 'super_admin') {
    return null;
  }

  const handleSwitchOrganization = async (orgId: string) => {
    if (orgId === currentOrganization?.id) {
      setIsOpen(false);
      return;
    }

    try {
      setLoading(true);
      await switchOrganization(orgId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        disabled={loading}
      >
        <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 max-w-32 truncate">
          {currentOrganization?.name || 'No Organization'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 mb-1">
                Switch Organization
              </div>
              
              <div className="space-y-1">
                {availableOrganizations.map((org) => {
                  const isSelected = org.id === currentOrganization?.id;
                  
                  return (
                    <button
                      key={org.id}
                      onClick={() => handleSwitchOrganization(org.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}
                      disabled={loading}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {org.name}
                        </div>
                        {org.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {org.description}
                          </div>
                        )}
                      </div>
                      
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              {availableOrganizations.length === 0 && (
                <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No organizations available
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};