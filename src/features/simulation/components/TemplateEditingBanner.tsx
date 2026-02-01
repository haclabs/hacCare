/**
 * Template Editing Banner
 * Shows when instructor is editing a simulation template
 * Provides context and "Save & Exit" button to return to template list
 */

import React, { useState, useEffect } from 'react';
import { Edit, Save, BookOpen, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../../contexts/TenantContext';
import { saveTemplateSnapshot } from '../../../services/simulation/simulationService';

interface TemplateEditingInfo {
  template_id: string;
  template_name: string;
  tenant_id: string;
}

export const TemplateEditingBanner: React.FC = () => {
  const [editingInfo, setEditingInfo] = useState<TemplateEditingInfo | null>(null);
  const [saving, setSaving] = useState(false);
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
    
    setSaving(true);
    
    try {
      // Step 1: Save the snapshot
      console.log('💾 Banner: Saving template snapshot...');
      const result = await saveTemplateSnapshot(editingInfo.template_id);
      
      if (result.success) {
        console.log('✅ Banner: Snapshot saved successfully');
        
        // Show success message with details
        const recordCount = result.records_captured || 0;
        const tableCount = result.tables_captured || 0;
        alert(`✅ Template saved successfully!\n\n${recordCount} records captured from ${tableCount} tables.\n\nReturning to templates...`);
      } else {
        console.error('❌ Banner: Failed to save snapshot:', result.message);
        alert(`❌ Failed to save template:\n\n${result.message}`);
        setSaving(false);
        return; // Don't exit if save failed
      }
      
      // Step 2: Clear the editing state
      sessionStorage.removeItem('editing_template');
      setEditingInfo(null);

      // Step 3: Exit template tenant (returns to home tenant)
      console.log('🔙 Banner: Exiting template tenant');
      await exitTemplateTenant();
      console.log('✅ Banner: Successfully exited template tenant');
      
      // Step 4: Navigate back to simulations/templates tab
      navigate('/app');
      window.dispatchEvent(new CustomEvent('change-tab', { detail: { tab: 'simulations' } }));
      
    } catch (error) {
      console.error('❌ Banner: Error during save/exit:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to save template'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!editingInfo) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 xl:px-12 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Template Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
              <Edit className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-wide">
                Editing Template
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm font-medium">{editingInfo.template_name}</span>
            </div>
          </div>

          {/* Right: Save Button */}
          <button
            onClick={handleExitTemplate}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium text-sm shadow-md hover:shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Save & Exit</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
