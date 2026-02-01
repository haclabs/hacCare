import React, { useState, useRef } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Download, FileText } from 'lucide-react';
import Papa from 'papaparse';
import { bulkCreateStudents } from '../../services/admin/programService';

interface CSVImportModalProps {
  programId: string;
  programName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface StudentData {
  first_name: string;
  last_name: string;
  email: string;
  student_number: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  programId,
  programName,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data as any[];
        const errors: ValidationError[] = [];
        const validStudents: StudentData[] = [];

        parsedData.forEach((row, index) => {
          const student: StudentData = {
            first_name: row.first_name?.trim() || row.First_Name?.trim() || row['First Name']?.trim() || '',
            last_name: row.last_name?.trim() || row.Last_Name?.trim() || row['Last Name']?.trim() || '',
            email: row.email?.trim() || row.Email?.trim() || '',
            student_number: row.student_number?.trim() || row.Student_Number?.trim() || row['Student Number']?.trim() || ''
          };

          // Validate required fields
          if (!student.first_name) {
            errors.push({ row: index + 1, field: 'first_name', message: 'First name is required' });
          }
          if (!student.last_name) {
            errors.push({ row: index + 1, field: 'last_name', message: 'Last name is required' });
          }
          if (!student.email) {
            errors.push({ row: index + 1, field: 'email', message: 'Email is required' });
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
            errors.push({ row: index + 1, field: 'email', message: 'Invalid email format' });
          }
          if (!student.student_number) {
            errors.push({ row: index + 1, field: 'student_number', message: 'Student number is required' });
          }

          // Only add if all required fields present
          if (student.first_name && student.last_name && student.email && student.student_number) {
            validStudents.push(student);
          }
        });

        setStudents(validStudents);
        setValidationErrors(errors);
        setStep('preview');
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        alert('Error parsing CSV file. Please check the file format.');
      }
    });
  };

  const handleImport = async () => {
    if (students.length === 0) return;

    setImporting(true);
    try {
      const { data, error } = await bulkCreateStudents(programId, students);
      
      if (error) {
        throw error;
      }

      setImportResult(data);
      setStep('result');
    } catch (error: any) {
      console.error('Import error:', error);
      alert('Import failed: ' + (error.message || 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  const downloadErrorReport = () => {
    if (!importResult?.errors || importResult.errors.length === 0) return;

    const csv = Papa.unparse(importResult.errors);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_errors.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const template = [
      { first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com', student_number: 'S12345' },
      { first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@example.com', student_number: 'S12346' }
    ];
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Students</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{programName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  CSV Format Requirements
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>Required columns: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">first_name</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">last_name</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">email</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">student_number</code></li>
                  <li>First row must be headers</li>
                  <li>Student numbers must be unique</li>
                  <li>System will auto-generate passwords and send reset emails</li>
                </ul>
                <button
                  onClick={downloadTemplate}
                  className="mt-3 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
                >
                  <Download className="h-4 w-4" />
                  Download Template CSV
                </button>
              </div>

              {/* Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">CSV file only</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {students.length} valid students found
                  </p>
                  {validationErrors.length > 0 && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {validationErrors.length} rows with errors (will be skipped)
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setStep('upload');
                    setFile(null);
                    setStudents([]);
                    setValidationErrors([]);
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Choose different file
                </button>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Validation Errors
                  </h4>
                  <div className="space-y-1">
                    {validationErrors.slice(0, 10).map((error, idx) => (
                      <p key={idx} className="text-sm text-red-800 dark:text-red-200">
                        Row {error.row}: {error.message} ({error.field})
                      </p>
                    ))}
                    {validationErrors.length > 10 && (
                      <p className="text-sm text-red-700 dark:text-red-300 italic">
                        ...and {validationErrors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">First Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Student #</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {students.map((student, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{student.first_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{student.last_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{student.email}</td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{student.student_number}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="space-y-6">
              {/* Success Summary */}
              <div className={`rounded-lg p-6 ${
                importResult.error_count === 0
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              }`}>
                <div className="flex items-start gap-3">
                  {importResult.error_count === 0 ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-2 ${
                      importResult.error_count === 0
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-yellow-900 dark:text-yellow-100'
                    }`}>
                      Import Complete
                    </h3>
                    <p className={`text-sm mb-3 ${
                      importResult.error_count === 0
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {importResult.imported_count} students imported successfully
                      {importResult.error_count > 0 && `, ${importResult.error_count} errors`}
                    </p>
                    {importResult.imported_count > 0 && (
                      <p className={`text-sm ${
                        importResult.error_count === 0
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-yellow-700 dark:text-yellow-300'
                      }`}>
                        ✉️ Password reset emails have been sent to all new students
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Import Errors</h4>
                    <button
                      onClick={downloadErrorReport}
                      className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      Download Error Report
                    </button>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {importResult.errors.map((error: any, idx: number) => (
                      <div key={idx} className="text-sm text-red-800 dark:text-red-200 mb-2">
                        <span className="font-medium">{error.email}</span> ({error.student_number}): {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {step === 'upload' && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          
          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={importing || students.length === 0}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Importing...
                  </>
                ) : (
                  <>Import {students.length} Students</>
                )}
              </button>
            </>
          )}

          {step === 'result' && (
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;
