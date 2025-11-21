/**
 * ===========================================================================
 * TEMPLATE IMPORT SERVICE
 * ===========================================================================
 * Service for importing simulation templates from export files
 * Validates and creates new templates with preserved patient barcodes
 * ===========================================================================
 */

import { supabase } from '../../../lib/api/supabase';
import type {
  TemplateExportPackage,
  TemplateImportOptions,
  TemplateImportResult,
  TemplateValidationResult,
} from '../types/templateSnapshot';

/**
 * Validate a template export package before import
 * Checks structure, required fields, and data integrity
 * 
 * @param exportPackage - The export package to validate
 * @returns Validation result with errors and warnings
 */
export function validateTemplateExport(
  exportPackage: any
): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check export version
  if (!exportPackage.export_version) {
    errors.push('Missing export_version');
  } else if (exportPackage.export_version !== '1.0') {
    warnings.push(`Export version ${exportPackage.export_version} may not be fully compatible`);
  }

  // Check template section
  if (!exportPackage.template) {
    errors.push('Missing template section');
  } else {
    if (!exportPackage.template.name) {
      errors.push('Template name is required');
    }
    if (!exportPackage.template.default_duration_minutes) {
      warnings.push('No default duration specified');
    }
  }

  // Check snapshot section
  if (!exportPackage.snapshot) {
    errors.push('Missing snapshot section');
  } else if (!exportPackage.snapshot.data) {
    errors.push('Snapshot data is empty');
  }

  // Get snapshot details if available
  const hasSnapshot = !!exportPackage.snapshot?.data;
  const snapshotData = exportPackage.snapshot?.data || {};
  const patientCount = snapshotData.patients?.length || 0;
  const medicationCount = snapshotData.medications?.length || 0;

  // Check for patient data
  if (hasSnapshot && patientCount === 0) {
    warnings.push('No patients found in snapshot');
  }

  // Check for patient UUIDs (needed for barcode preservation)
  if (hasSnapshot && patientCount > 0) {
    const firstPatient = snapshotData.patients[0];
    if (!firstPatient.id) {
      errors.push('Patient records missing UUIDs - barcode preservation will fail');
    }
    if (!firstPatient.patient_id) {
      warnings.push('Patient records missing barcode IDs');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    patient_count: patientCount,
    medication_count: medicationCount,
    has_snapshot: hasSnapshot,
  };
}

/**
 * Import a simulation template from export package
 * Creates new template with tenant and preserves patient barcodes
 * 
 * @param exportPackage - The template export to import
 * @param options - Import options (preserveIds, overrides, etc.)
 * @returns Result with new template ID and tenant ID
 */
export async function importSimulationTemplate(
  exportPackage: TemplateExportPackage,
  options: TemplateImportOptions = { preserve_patient_ids: true }
): Promise<TemplateImportResult> {
  try {
    // Validate export package
    const validation = validateTemplateExport(exportPackage);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
        warnings: validation.warnings,
      };
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Determine template name
    const templateName = options.template_name_override || exportPackage.template.name;
    const templateDescription = options.template_description_override || exportPackage.template.description;

    // Create new template
    const { data: createResult, error: createError } = await supabase.rpc(
      'create_simulation_template',
      {
        p_name: templateName,
        p_description: templateDescription,
        p_default_duration_minutes: exportPackage.template.default_duration_minutes,
      }
    );

    if (createError) {
      console.error('Error creating template:', createError);
      return {
        success: false,
        error: `Failed to create template: ${createError.message}`,
      };
    }

    if (!createResult || !createResult.success) {
      return {
        success: false,
        error: 'Failed to create template: No result returned',
      };
    }

    const templateId = createResult.template_id;
    const tenantId = createResult.tenant_id;

    // Prepare snapshot data
    // If preserving patient IDs, include the original UUIDs and barcodes
    const snapshotData = exportPackage.snapshot.data;

    if (options.preserve_patient_ids) {
      console.log('Preserving patient UUIDs and barcodes from export');
      // The snapshot already contains patient UUIDs and barcode IDs
      // These will be used when restoring to tenant
    } else {
      console.warn('Not preserving patient IDs - new IDs will be generated');
      // Could strip IDs here if needed, but generally we want to preserve them
    }

    // Update template with snapshot data
    const { error: updateError } = await supabase
      .from('simulation_templates')
      .update({
        snapshot_data: snapshotData,
        snapshot_version: exportPackage.snapshot.version || 1,
        snapshot_taken_at: exportPackage.snapshot.snapshot_taken_at || new Date().toISOString(),
        status: 'ready', // Mark as ready since it has a snapshot
      })
      .eq('id', templateId);

    if (updateError) {
      console.error('Error updating template with snapshot:', updateError);
      return {
        success: false,
        error: `Template created but snapshot failed: ${updateError.message}`,
        template_id: templateId,
        tenant_id: tenantId,
      };
    }

    console.log(`✅ Template imported successfully: ${templateId}`);
    console.log(`   Tenant: ${tenantId}`);
    console.log(`   Patients: ${validation.patient_count}`);
    console.log(`   Medications: ${validation.medication_count}`);

    return {
      success: true,
      template_id: templateId,
      tenant_id: tenantId,
      warnings: validation.warnings,
    };
  } catch (error: any) {
    console.error('Error importing template:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during import',
    };
  }
}

/**
 * Read and parse a template export file
 * 
 * @param file - The JSON file to parse
 * @returns Parsed export package
 */
export async function parseTemplateExportFile(
  file: File
): Promise<TemplateExportPackage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const exportPackage = JSON.parse(text) as TemplateExportPackage;
        resolve(exportPackage);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Complete import workflow: read file, validate, and import
 * 
 * @param file - The JSON export file
 * @param options - Import options
 * @returns Import result
 */
export async function importTemplateFromFile(
  file: File,
  options?: TemplateImportOptions
): Promise<TemplateImportResult> {
  try {
    // Parse file
    const exportPackage = await parseTemplateExportFile(file);

    // Validate
    const validation = validateTemplateExport(exportPackage);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
        warnings: validation.warnings,
      };
    }

    // Import
    const result = await importSimulationTemplate(exportPackage, options);

    return result;
  } catch (error: any) {
    console.error('Error importing template from file:', error);
    return {
      success: false,
      error: error.message || 'Failed to import template',
    };
  }
}
