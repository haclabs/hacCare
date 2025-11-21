/**
 * ===========================================================================
 * TEMPLATE SNAPSHOT EXPORT/IMPORT TYPES
 * ===========================================================================
 * Type definitions for template snapshot export and import functionality
 * ===========================================================================
 */

/**
 * Complete template export package
 * Contains all template metadata and the full snapshot data
 */
export interface TemplateExportPackage {
  // Metadata about the export
  export_version: string;
  exported_at: string;
  exported_by: string;
  
  // Template information
  template: {
    name: string;
    description: string | null;
    default_duration_minutes: number;
    status: 'draft' | 'ready' | 'archived';
  };
  
  // Complete snapshot data (JSONB from simulation_templates.snapshot_data)
  snapshot: {
    version: number;
    snapshot_taken_at: string;
    data: any; // Full JSONB snapshot with all 18 patient tables
  };
}

/**
 * Import options for template restoration
 */
export interface TemplateImportOptions {
  // Whether to preserve patient UUIDs (for barcode compatibility)
  preserve_patient_ids: boolean;
  
  // Optional: Override template name
  template_name_override?: string;
  
  // Optional: Override template description
  template_description_override?: string;
}

/**
 * Result of template import operation
 */
export interface TemplateImportResult {
  success: boolean;
  template_id?: string;
  tenant_id?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Validation result for imported template
 */
export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  patient_count?: number;
  medication_count?: number;
  has_snapshot: boolean;
}
