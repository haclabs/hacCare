import React, { useState, useEffect } from 'react';
import { FileText, Clock, User, RefreshCw } from 'lucide-react';
import { fetchPatientBowelRecords, BowelRecord } from '../../../services/clinical/bowelRecordService';
import { formatLocalTime } from '../../../utils/time';

interface BowelRecordsListProps {
  patientId: string;
}

export const BowelRecordsList: React.FC<BowelRecordsListProps> = ({ 
  patientId 
}) => {
  const [records, setRecords] = useState<BowelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, [patientId]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPatientBowelRecords(patientId);
      setRecords(data);
    } catch (err: any) {
      console.error('Error loading bowel records:', err);
      setError(err.message || 'Failed to load bowel records');
    } finally {
      setLoading(false);
    }
  };

  const getIncontinenceColor = (incontinence: string) => {
    switch (incontinence) {
      case 'Continent': return 'bg-green-100 text-green-800 border-green-200';
      case 'Partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Incontinent': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAppearanceColor = (appearance: string) => {
    switch (appearance) {
      case 'Normal': return 'bg-green-100 text-green-800 border-green-200';
      case 'Abnormal': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Blood present': return 'bg-red-100 text-red-800 border-red-200';
      case 'Mucus present': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
        <p className="text-gray-500">Loading bowel records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 mb-2">{error}</p>
        <button
          onClick={loadRecords}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Bowel Records</h3>
        <p className="text-gray-600">No bowel movements have been recorded for this patient.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record) => (
        <div 
          key={record.id} 
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Bowel Record</h4>
                <div className="flex items-center text-xs text-gray-500 space-x-2">
                  <Clock className="h-3 w-3" />
                  <span>{formatLocalTime(record.recorded_at, 'dd MMM yyyy - HH:mm')}</span>
                </div>
              </div>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getIncontinenceColor(record.bowel_incontinence)}`}>
              {record.bowel_incontinence}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
            <User className="h-4 w-4" />
            <span>{record.nurse_name}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Appearance</span>
              <div className={`mt-1 px-2 py-1 rounded text-xs font-medium border ${getAppearanceColor(record.stool_appearance)}`}>
                {record.stool_appearance}
              </div>
            </div>
            
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Consistency</span>
              <div className="mt-1 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                {record.stool_consistency}
              </div>
            </div>
            
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Colour</span>
              <div className="mt-1 px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                {record.stool_colour}
              </div>
            </div>
            
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</span>
              <div className="mt-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                {record.stool_amount}
              </div>
            </div>
          </div>

          {record.notes && (
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</span>
              <p className="text-sm text-gray-700 mt-1">{record.notes}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
