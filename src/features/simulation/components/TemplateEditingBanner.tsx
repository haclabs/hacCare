/**
 * Template Editing Banner
 * Shows when instructor is editing a simulation template
 * Provides context and "Save & Exit" button to return to template list
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Save, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../../contexts/TenantContext';

interface TemplateEditingInfo {
  template_id: string;
  template_name: string;
  tenant_id: string;
}

export const TemplateEditingBanner: React.FC = () => {
  const [editingInfo, setEditingInfo] = useState<TemplateEditingInfo | null>(null);
  const [originalTenantId, setOriginalTenantId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { currentTenant, switchToTenant, tenants } = useTenant();

  useEffect(() => {
    // Check if we're editing a template on mount
    const checkEditingState = async () => {
      const stored = sessionStorage.getItem('editing_template');
      console.log('🔍 Checking editing state:', stored);
      if (stored) {
        const info: TemplateEditingInfo = JSON.parse(stored);
        setEditingInfo(info);
        
        // Save current tenant to restore later
        if (currentTenant) {
          setOriginalTenantId(currentTenant.id);
          console.log('💾 Saved original tenant:', currentTenant.name);
        }
        
        // Switch to the template's tenant so all queries work naturally
        if (info.tenant_id && info.tenant_id !== currentTenant?.id) {
          console.log('🔄 Switching to template tenant:', info.tenant_id);
          await switchToTenant(info.tenant_id);
        }
      } else {
        setEditingInfo(null);
      }
    };

    // Check on mount
    checkEditingState();

    // Listen for custom event when editing starts
    const handleEditStart = async (e: CustomEvent) => {
      console.log('📢 Received template-edit-start event:', e.detail);
      const info = e.detail as TemplateEditingInfo;
      setEditingInfo(info);
      
      // Save current tenant
      if (currentTenant) {
        setOriginalTenantId(currentTenant.id);
      }
      
      // Switch to template's tenant
      if (info.tenant_id && info.tenant_id !== currentTenant?.id) {
        await switchToTenant(info.tenant_id);
      }
    };

    window.addEventListener('template-edit-start', handleEditStart as EventListener);

    return () => {
      window.removeEventListener('template-edit-start', handleEditStart as EventListener);
    };
  }, [currentTenant, switchToTenant]);

  const handleExitTemplate = async () => {
    if (!editingInfo) return;

    // Clear the editing state
    sessionStorage.removeItem('editing_template');
    setEditingInfo(null);

    // Switch back to original tenant if we saved it
    if (originalTenantId && originalTenantId !== currentTenant?.id) {
      console.log('🔙 Restoring original tenant:', originalTenantId);
      await switchToTenant(originalTenantId);
    }
    
    setOriginalTenantId(null);

    // Navigate back to simulations/templates tab
    navigate('/app');
    // Trigger tab change to simulations
    window.dispatchEvent(new CustomEvent('change-tab', { detail: { tab: 'simulations' } }));
  };

  if (!editingInfo) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm">Editing Template</div>
              <div className="text-xs text-purple-100">
                {editingInfo.template_name} - Make changes to patients, medications, and clinical data
              </div>
            </div>
          </div>

          <button
            onClick={handleExitTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium text-sm"
          >
            <Save className="h-4 w-4" />
            Save & Exit Template
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
