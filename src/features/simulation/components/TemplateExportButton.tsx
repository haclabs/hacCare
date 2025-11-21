/**
 * ===========================================================================
 * TEMPLATE EXPORT BUTTON COMPONENT
 * ===========================================================================
 * Export button for simulation templates with download functionality
 * ===========================================================================
 */

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadTemplateExport, getExportSummary } from '../services/templateExportService';

interface TemplateExportButtonProps {
  templateId: string;
  templateName: string;
  disabled?: boolean;
}

const TemplateExportButton: React.FC<TemplateExportButtonProps> = ({
  templateId,
  templateName,
  disabled = false,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (disabled || isExporting) return;

    try {
      setIsExporting(true);

      // Get export summary first
      const summary = await getExportSummary(templateId);
      
      if (!summary.has_snapshot) {
        alert('This template has no snapshot. Save a snapshot before exporting.');
        return;
      }

      // Show confirmation with summary
      const confirmMessage = `Export template "${summary.template_name}"?\n\n` +
        `📦 Patients: ${summary.patient_count}\n` +
        `💊 Medications: ${summary.medication_count}\n` +
        `📏 Size: ~${summary.estimated_size_kb} KB\n\n` +
        `A JSON file will be downloaded to your computer.`;

      if (!confirm(confirmMessage)) {
        return;
      }

      // Download export
      await downloadTemplateExport(templateId, templateName);
      
      // Success notification
      alert(`✅ Template exported successfully!\n\nThe file has been downloaded to your Downloads folder.`);
    } catch (error: any) {
      console.error('Error exporting template:', error);
      alert(`❌ Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || isExporting}
      className="p-2 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      title="Export template to JSON file"
    >
      {isExporting ? (
        <div className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </button>
  );
};

export default TemplateExportButton;
