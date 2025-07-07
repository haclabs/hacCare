import React, { useState, useEffect } from 'react';
import { Clock, User, FileText, Search, RefreshCw, X } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { fetchMedicationAdministrationHistory } from '../../lib/medicationService';
import { MedicationAdministration } from '../../types';

interface MedicationAdministrationHistoryProps {
  medicationId: string;
  patientId: string;
  medicationName: string;
  patientId: string;
  onClose: () => void;
}

export const MedicationAdministrationHistory: React.FC<MedicationAdministrationHistoryProps> = ({
  medicationId,
  patientId,
  medicationName,
  patientId,
  onClose
}) => {
  const [administrations, setAdministrations] = useState<MedicationAdministration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAdministrations();
  }, [medicationId, patientId]);

  const fetchAdministrations = async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await fetchMedicationAdministrationHistory(medicationId, patientId);
      setAdministrations(data);
    } catch (err: any) {
      console.error('Error fetching medication administrations:', err);
      setError(err.message || 'Failed to load administration history');
    } finally {
      setLoading(false);
    }
  };

  const filteredAdministrations = administrations.filter(admin => {
    const searchLower = searchTerm.toLowerCase();
    return (
      admin.administered_by.toLowerCase().includes(searchLower) ||
      (admin.notes && admin.notes.toLowerCase().includes(searchLower))
    );
  });

  // Safe date formatting
  const safeFormatDate = (dateValue: string | Date | null | undefined, formatString: string): string => {
    if (!dateValue) return 'N/A';
    
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
    
    if (!isValid(date)) return 'N/A';
    
    return format(date, formatString);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Administration History: {medicationName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Administration History</h3>
            <button
              onClick={fetchAdministrations}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Refresh history"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          {administrations.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search administrations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">Loading administration history...</p>
            </div>
          ) : filteredAdministrations.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Clock className="h-8 w-8 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No administration records found</p>
              {searchTerm && (
                <p className="text-sm text-gray-400 mt-2">Try adjusting your search terms</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAdministrations.map((admin) => (
                <div key={admin.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-gray-900">
                        {safeFormatDate(admin.timestamp, 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {safeFormatDate(admin.timestamp, 'EEEE')}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <p className="text-sm text-gray-700">
                      Administered by: <span className="font-medium">{admin.administered_by}</span>
                    </p>
                  </div>
                  
                  {admin.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                        <p className="text-sm text-gray-700">{admin.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};