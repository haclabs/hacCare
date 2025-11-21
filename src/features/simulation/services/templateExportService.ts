/**
 * ===========================================================================
 * TEMPLATE EXPORT SERVICE
 * ===========================================================================
 * Service for exporting simulation templates with full snapshot data
 * Exports can be shared, backed up, or imported to other instances
 * ===========================================================================
 */

import { supabase } from '../../../lib/api/supabase';
import type { TemplateExportPackage } from '../types/templateSnapshot';

/**
 * Export a simulation template with complete snapshot data
 * Creates a JSON file containing all template metadata and patient data
 * 
 * @param templateId - UUID of the template to export
 * @returns Export package with all template data
 */
export async function exportSimulationTemplate(
  templateId: string
): Promise<TemplateExportPackage> {
  try {
    // Get current user for metadata
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Fetch template with snapshot data
    const { data: template, error } = await supabase
      .from('simulation_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    if (!template) throw new Error('Template not found');
    if (!template.snapshot_data) {
      throw new Error('Template has no snapshot. Save a snapshot before exporting.');
    }

    // Build export package
    const exportPackage: TemplateExportPackage = {
      // Export metadata
      export_version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: user.email || user.id,

      // Template information (without internal IDs)
      template: {
        name: template.name,
        description: template.description,
        default_duration_minutes: template.default_duration_minutes,
        status: template.status,
      },

      // Complete snapshot data
      snapshot: {
        version: template.snapshot_version,
        snapshot_taken_at: template.snapshot_taken_at || new Date().toISOString(),
        data: template.snapshot_data, // Full JSONB with all patient tables
      },
    };

    return exportPackage;
  } catch (error: any) {
    console.error('Error exporting template:', error);
    throw error;
  }
}

/**
 * Download template export as JSON file
 * 
 * @param templateId - UUID of template to export
 * @param templateName - Name for the downloaded file
 */
export async function downloadTemplateExport(
  templateId: string,
  templateName: string
): Promise<void> {
  try {
    // Get export package
    const exportPackage = await exportSimulationTemplate(templateId);

    // Create JSON blob
    const jsonString = JSON.stringify(exportPackage, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename: template-name_YYYY-MM-DD.json
    const date = new Date().toISOString().split('T')[0];
    const safeName = templateName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeName}_${date}.json`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('Error downloading template export:', error);
    throw error;
  }
}

/**
 * Get export summary without downloading
 * Useful for preview before export
 * 
 * @param templateId - UUID of template
 * @returns Summary information about the export
 */
export async function getExportSummary(templateId: string): Promise<{
  template_name: string;
  patient_count: number;
  medication_count: number;
  has_snapshot: boolean;
  snapshot_date: string | null;
  estimated_size_kb: number;
}> {
  try {
    const { data: template, error } = await supabase
      .from('simulation_templates')
      .select('name, snapshot_data, snapshot_taken_at')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    if (!template) throw new Error('Template not found');

    const snapshotData = template.snapshot_data || {};
    const patientCount = snapshotData.patients?.length || 0;
    const medicationCount = snapshotData.medications?.length || 0;
    
    // Estimate size
    const jsonString = JSON.stringify(snapshotData);
    const estimatedSizeKb = Math.round((jsonString.length / 1024) * 100) / 100;

    return {
      template_name: template.name,
      patient_count: patientCount,
      medication_count: medicationCount,
      has_snapshot: !!template.snapshot_data,
      snapshot_date: template.snapshot_taken_at,
      estimated_size_kb: estimatedSizeKb,
    };
  } catch (error: any) {
    console.error('Error getting export summary:', error);
    throw error;
  }
}
