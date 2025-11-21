/**
 * ===========================================================================
 * TEMPLATE IMPORT MODAL COMPONENT
 * ===========================================================================
 * Modal for importing simulation templates from JSON export files
 * ===========================================================================
 */

import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle, FileJson } from 'lucide-react';
import { importTemplateFromFile, validateTemplateExport } from '../services/templateImportService';
import type { TemplateValidationResult, TemplateImportResult } from '../types/templateSnapshot';

interface TemplateImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TemplateImportModal: React.FC<TemplateImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<TemplateValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<TemplateImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidation(null);
    setImportResult(null);

    // Validate the file
    try {
      const text = await file.text();
      const exportPackage = JSON.parse(text);
      const validationResult = validateTemplateExport(exportPackage);
      setValidation(validationResult);
    } catch (error) {
      setValidation({
        valid: false,
        errors: ['Invalid JSON file or corrupted export'],
        warnings: [],
        has_snapshot: false,
      });
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !validation?.valid) return;

    setImporting(true);
    try {
      // Parse file to get template name
      const text = await selectedFile.text();
      const exportPackage = JSON.parse(text);
      
      // Add timestamp suffix to ensure uniqueness
      const timestamp = new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      const importedName = `${exportPackage.template.name} (Imported ${timestamp})`;
      
      const result = await importTemplateFromFile(selectedFile, {
        preserve_patient_ids: true, // Always preserve for barcode compatibility
        template_name_override: importedName,
      });

      setImportResult(result);

      if (result.success) {
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      }
    } catch (error: any) {
      setImportResult({
        success: false,
        error: error.message || 'Import failed',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setValidation(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Upload className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Import Template
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Import a simulation template from JSON export file
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Select Export File
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                selectedFile
                  ? 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-500'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileJson className="h-12 w-12 mx-auto mb-3 text-purple-600 dark:text-purple-400" />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Click to select a JSON file
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Only .json export files are supported
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Validation Results */}
          {validation && (
            <div className="space-y-3">
              {/* Errors */}
              {validation.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="font-semibold text-red-900 dark:text-red-100">
                      Validation Errors
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-200 space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold text-amber-900 dark:text-amber-100">
                      Warnings
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-sm text-amber-800 dark:text-amber-200 space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success */}
              {validation.valid && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      Valid Template Export
                    </span>
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                    <p>📦 Patients: {validation.patient_count || 0}</p>
                    <p>💊 Medications: {validation.medication_count || 0}</p>
                    <p>✅ Ready to import</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div
              className={`border rounded-lg p-4 ${
                importResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {importResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span className={`font-semibold ${
                  importResult.success
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {importResult.success ? 'Import Successful!' : 'Import Failed'}
                </span>
              </div>
              <div className={`text-sm ${
                importResult.success
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {importResult.success ? (
                  <div>
                    <p>Template ID: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded">{importResult.template_id}</code></p>
                    <p>Tenant ID: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded">{importResult.tenant_id}</code></p>
                    <p className="mt-2">The template is now ready to launch!</p>
                  </div>
                ) : (
                  <p>{importResult.error}</p>
                )}
              </div>
            </div>
          )}

          {/* Import Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              ℹ️ Import Information
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Patient UUIDs and barcodes will be preserved</li>
              <li>• Printed barcode labels will still work</li>
              <li>• A new template and tenant will be created</li>
              <li>• All baseline data will be restored from snapshot</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleClose}
            disabled={importing}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!validation?.valid || importing || !!importResult?.success}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {importing ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import Template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateImportModal;
