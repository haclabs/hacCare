/**
 * Template Editing Banner
 * Shows when instructor is editing a simulation template
 * Provides context and "Save & Exit" button to return to template list
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../../contexts/TenantContext';

interface TemplateEditingInfo {
  template_id: string;
  template_name: string;
  tenant_id: string;
}

export const TemplateEditingBanner: React.FC = () => {
  const [editingInfo, setEditingInfo] = useState<TemplateEditingInfo | null>(null);
  const navigate = useNavigate();
  const { currentTenant, enterTemplateTenant, exitTemplateTenant } = useTenant();

  useEffect(() => {
    // Check if we're editing a template on mount
    const checkEditingState = async () => {
      const stored = sessionStorage.getItem('editing_template');
      console.log('🔍 Banner: Checking editing state:', stored);
      if (stored) {
        const info: TemplateEditingInfo = JSON.parse(stored);
        setEditingInfo(info);
        
        // Switch to the template's tenant and grant instructor access
        if (info.tenant_id && info.tenant_id !== currentTenant?.id) {
          console.log('🔄 Banner: Switching to template tenant:', info.tenant_id);
          try {
            await enterTemplateTenant(info.tenant_id);
            console.log('✅ Banner: Successfully switched to template tenant');
          } catch (error) {
            console.error('❌ Banner: Failed to switch to template tenant:', error);
          }
        } else {
          console.log('ℹ️ Banner: Already in template tenant');
        }
      } else {
        setEditingInfo(null);
        console.log('ℹ️ Banner: No editing_template found in sessionStorage');
      }
    };

    // Check on mount
    checkEditingState();

    // Listen for custom event when editing starts
    const handleEditStart = async (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('📢 Banner: Received template-edit-start event:', customEvent.detail);
      const info = customEvent.detail as TemplateEditingInfo;
      setEditingInfo(info);
      
      // Switch to template's tenant
      if (info.tenant_id && info.tenant_id !== currentTenant?.id) {
        try {
          await enterTemplateTenant(info.tenant_id);
          console.log('✅ Banner: Successfully switched to template tenant (from event)');
        } catch (error) {
          console.error('❌ Banner: Failed to switch to template tenant (from event):', error);
        }
      }
    };

    window.addEventListener('template-edit-start', handleEditStart);

    return () => {
      window.removeEventListener('template-edit-start', handleEditStart);
    };
  }, [currentTenant, enterTemplateTenant]);

  const handleExitTemplate = async () => {
    if (!editingInfo) return;

    console.log('🚪 Banner: Exiting template editing mode');
    
    // Clear the editing state
    sessionStorage.removeItem('editing_template');
    setEditingInfo(null);

    // Exit template tenant (returns to home tenant)
    try {
      console.log('🔙 Banner: Exiting template tenant');
      await exitTemplateTenant();
      console.log('✅ Banner: Successfully exited template tenant');
    } catch (error) {
      console.error('❌ Banner: Failed to exit template tenant:', error);
    }

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
