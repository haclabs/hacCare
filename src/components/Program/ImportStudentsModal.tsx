import React, { useState } from 'react';
import { X, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { bulkCreateStudents } from '../../services/admin/programService';

interface ImportStudentsModalProps {
  programId: string;
  programName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  success: boolean;
  imported_count: number;
  error_count: number;
  errors: Array<{
    email: string;
    student_number: string;
    error: string;
  }>;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  programId,
  programName,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  const downloadTemplate = () => {
    const csv = 'first_name,last_name,email,student_number\nJohn,Doe,john.doe@example.com,S123456\nJane,Smith,jane.smith@example.com,S123457';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const parseCSV = (text: string): Array<{
    first_name: string;
    last_name: string;
    email: string;
    student_number: string;
  }> => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) throw new Error('CSV file is empty');

    // Parse header
    const header = lines[0].split(',').map(h => h.trim());
    const requiredFields = ['first_name', 'last_name', 'email', 'student_number'];
    
    for (const field of requiredFields) {
      if (!header.includes(field)) {
        throw new Error(`Missing required column: ${field}`);
      }
    }

    // Parse rows
    const students = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== header.length) continue;

      const student: any = {};
      header.forEach((key, index) => {
        student[key] = values[index];
      });

      // Validate required fields
      if (student.first_name && student.last_name && student.email && student.student_number) {
        students.push({
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email,
          student_number: student.student_number
        });
      }
    }

    if (students.length === 0) {
      throw new Error('No valid student records found in CSV');
    }

    return students;
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Read file
      const text = await file.text();
      const students = parseCSV(text);

      console.log(`📊 Parsed ${students.length} students from CSV`);

      // Call bulk create RPC function
      const { data, error: importError } = await bulkCreateStudents(programId, students);

      if (importError) throw importError;
      if (!data) throw new Error('No response from server');

      setResult(data);

      // If all successful, close after a delay
      if (data.error_count === 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }

    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import students');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import Students</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{programName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">CSV Format Requirements</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Required columns: <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">first_name</code>, <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">last_name</code>, <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">email</code>, <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">student_number</code></li>
              <li>• Passwords will be auto-generated and emailed</li>
              <li>• Students will be set as simulation-only users</li>
              <li>• Duplicate emails/student numbers will be skipped</li>
            </ul>
          </div>

          {/* Download Template */}
          <div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download CSV Template
            </button>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload CSV File
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition-colors"
              >
                Choose CSV File
              </label>
              {file && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Selected: {file.name}
                </p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">Import Failed</p>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Import Results */}
          {result && (
            <div className="space-y-4">
              {/* Success Summary */}
              {result.imported_count > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      ✅ Successfully imported {result.imported_count} student{result.imported_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Error Summary */}
              {result.error_count > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                    ⚠️ {result.error_count} error{result.error_count !== 1 ? 's' : ''} encountered
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {result.errors.map((err, index) => (
                      <div key={index} className="text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/30 rounded p-2">
                        <p className="font-medium">{err.email} ({err.student_number})</p>
                        <p className="text-xs mt-1">{err.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={handleImport}
              disabled={loading || !file || !!result}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Importing...' : result ? 'Import Complete' : 'Import Students'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {result ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportStudentsModal;
