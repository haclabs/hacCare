/**
 * Diabetic Record Module Component
 * Provides comprehensive diabetic patient management with BBIT support
 */

import React, { useState, useEffect } from 'react';
import { Plus, Save, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

import { useAuth } from '../contexts/auth/SimulationAwareAuthProvider';
import { 
  DiabeticRecord, 
  DiabeticRecordFormData,
  GlucoseTrendPoint,
  ReadingType,
  getGlucoseStatus,
  getCurrentTime,
  getCurrentDate 
} from '../types/diabeticRecord';
import { diabeticRecordService } from '../services/clinical/diabeticRecordService';

interface DiabeticRecordModuleProps {
  patientId: string;
  patientName: string;
}

const DiabeticRecordModule: React.FC<DiabeticRecordModuleProps> = ({ patientId, patientName }) => {
  // Auth context - with error handling
  let user = null;
  let authError: string | null = null;
  
  try {
    const authContext = useAuth();
    user = authContext.user;
  } catch (error) {
    authError = error instanceof Error ? error.message : 'Authentication error';
    console.error('Auth context error:', error);
  }
  
  // State management
  const [records, setRecords] = useState<DiabeticRecord[]>([]);
  const [trendData, setTrendData] = useState<GlucoseTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'trends'>('entry');
  const [glucoseStats, setGlucoseStats] = useState<any>({});

  // Form state
  const [formData, setFormData] = useState<DiabeticRecordFormData>({
    date: getCurrentDate(),
    timeCbgTaken: getCurrentTime(),
    readingType: 'AC',
    glucoseReading: '',
    treatmentsGiven: '',
    commentsForPhysician: '',
    signature: '',
    basalInsulinType: 'LANTUS',
    basalInsulinUnits: '',
    basalTimeAdministered: '',
    basalInjectionSite: '',
    bolusInsulinType: 'HUMALOG',
    bolusInsulinUnits: '',
    bolusTimeAdministered: '',
    bolusInjectionSite: '',
    correctionInsulinType: 'HUMALOG',
    correctionInsulinUnits: '',
    correctionTimeAdministered: '',
    correctionInjectionSite: '',
    otherInsulinType: '',
    otherInsulinUnits: '',
    otherTimeAdministered: '',
    otherInjectionSite: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadDiabeticRecords();
    loadTrendData();
    loadGlucoseStats();
  }, [patientId]);

  const loadDiabeticRecords = async () => {
    try {
      setLoading(true);
      const data = await diabeticRecordService.getPatientDiabeticRecords(patientId);
      setRecords(data);
    } catch (error) {
      console.error('Error loading diabetic records:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendData = async () => {
    try {
      const data = await diabeticRecordService.getGlucoseTrendData(patientId, 72);
      setTrendData(data);
    } catch (error) {
      console.error('Error loading trend data:', error);
    }
  };

  const loadGlucoseStats = async () => {
    try {
      const stats = await diabeticRecordService.getGlucoseStatistics(patientId, 7);
      setGlucoseStats(stats);
    } catch (error) {
      console.error('Error loading glucose statistics:', error);
    }
  };

  const handleInputChange = (field: keyof DiabeticRecordFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.glucoseReading || !formData.signature) {
      alert('Please fill in all required fields (glucose reading and signature)');
      return;
    }

    if (authError) {
      alert('Authentication error. Please refresh the page and log in again.');
      return;
    }

    if (!user?.id) {
      alert('User not authenticated. Please log in again.');
      return;
    }

    try {
      setSaving(true);
      console.log('Creating diabetic record with user ID:', user.id);
      await diabeticRecordService.createDiabeticRecord(patientId, formData, user.id);
      
      // Reset form
      setFormData({
        ...formData,
        timeCbgTaken: getCurrentTime(),
        glucoseReading: '',
        treatmentsGiven: '',
        commentsForPhysician: '',
        signature: '',
        basalInsulinUnits: '',
        basalTimeAdministered: '',
        basalInjectionSite: '',
        bolusInsulinUnits: '',
        bolusTimeAdministered: '',
        bolusInjectionSite: '',
        correctionInsulinUnits: '',
        correctionTimeAdministered: '',
        correctionInjectionSite: '',
        otherInsulinUnits: '',
        otherTimeAdministered: '',
        otherInjectionSite: ''
      });

      // Reload data
      loadDiabeticRecords();
      loadTrendData();
      loadGlucoseStats();
      
      // Switch to history tab to show the new record
      setActiveTab('history');
    } catch (error) {
      console.error('Error saving diabetic record:', error);
      alert('Error saving record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderGlucoseStatus = (reading: number) => {
    const status = getGlucoseStatus(reading);
    const statusColors = {
      'Critical Low': 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium',
      'Low': 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium',
      'Normal': 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium',
      'High': 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium',
      'Critical High': 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium'
    };

    return (
      <span className={statusColors[status]}>
        {status}
      </span>
    );
  };

  const renderEntryForm = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          New Diabetic Record Entry
        </h3>
      </div>
      <div className="space-y-6">
        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Time CBG Taken *</label>
            <input
              id="time"
              type="time"
              value={formData.timeCbgTaken}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('timeCbgTaken', e.target.value)}
              step="60"
              pattern="[0-9]{2}:[0-9]{2}"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 time-24h"
              style={{ colorScheme: 'light' }}
            />
          </div>
          <div>
            <label htmlFor="readingType" className="block text-sm font-medium text-gray-700 mb-1">Reading Type</label>
            <select
              id="readingType"
              value={formData.readingType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('readingType', e.target.value as ReadingType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="AC">AC (Before Meals)</option>
              <option value="PC">PC (After Meals)</option>
              <option value="HS">HS (Hour of Sleep)</option>
              <option value="AM">AM (Morning)</option>
              <option value="PRN">PRN (As Needed)</option>
            </select>
          </div>
        </div>

        {/* Glucose Reading */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="glucose" className="block text-sm font-medium text-gray-700 mb-1">Glucose Reading (mmol/L) *</label>
            <input
              id="glucose"
              type="number"
              step="0.1"
              min="0"
              max="50"
              value={formData.glucoseReading}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('glucoseReading', e.target.value)}
              placeholder="e.g., 7.2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData.glucoseReading && (
              <div className="mt-2">
                {renderGlucoseStatus(parseFloat(formData.glucoseReading))}
              </div>
            )}
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Insulin Administration */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Insulin Administration</h4>
          
          {/* Abbreviated insulin form for now */}
          <div className="space-y-4">
            <div>
              <label htmlFor="basalInsulinUnits" className="block text-sm font-medium text-gray-700 mb-1">Basal Insulin Units</label>
              <input
                id="basalInsulinUnits"
                type="number"
                step="0.5"
                min="0"
                value={formData.basalInsulinUnits}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('basalInsulinUnits', e.target.value)}
                placeholder="e.g., 24"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="bolusInsulinUnits" className="block text-sm font-medium text-gray-700 mb-1">Bolus Insulin Units</label>
              <input
                id="bolusInsulinUnits"
                type="number"
                step="0.5"
                min="0"
                value={formData.bolusInsulinUnits}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('bolusInsulinUnits', e.target.value)}
                placeholder="e.g., 8"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="correctionInsulinUnits" className="block text-sm font-medium text-gray-700 mb-1">Correction Insulin Units</label>
              <input
                id="correctionInsulinUnits"
                type="number"
                step="0.5"
                min="0"
                value={formData.correctionInsulinUnits}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('correctionInsulinUnits', e.target.value)}
                placeholder="e.g., 2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Clinical Notes */}
        <div className="space-y-4">
          <div>
            <label htmlFor="treatments" className="block text-sm font-medium text-gray-700 mb-1">Treatments Given</label>
            <textarea
              id="treatments"
              value={formData.treatmentsGiven}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('treatmentsGiven', e.target.value)}
              placeholder="Detail any treatments, medications, or interventions provided..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">Comments for Physician</label>
            <textarea
              id="comments"
              value={formData.commentsForPhysician}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('commentsForPhysician', e.target.value)}
              placeholder="Any observations, concerns, or recommendations for the physician..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="signature" className="block text-sm font-medium text-gray-700 mb-1">Nurse Signature *</label>
            <input
              id="signature"
              value={formData.signature}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('signature', e.target.value)}
              placeholder="Enter your full name"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button 
            onClick={handleSubmit} 
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Record
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Diabetic Records
        </h3>
        {glucoseStats.count > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-600">7-Day Average</div>
              <div className="text-xl font-bold text-blue-700">{glucoseStats.average} mmol/L</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-green-600">In Range</div>
              <div className="text-xl font-bold text-green-700">{glucoseStats.percentInRange}%</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-sm text-orange-600">Min/Max</div>
              <div className="text-xl font-bold text-orange-700">{glucoseStats.min} / {glucoseStats.max}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-purple-600">Total Readings</div>
              <div className="text-xl font-bold text-purple-700">{glucoseStats.count}</div>
            </div>
          </div>
        )}
      </div>
      <div>
        {loading ? (
          <div className="text-center py-8">Loading records...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No diabetic records found. Create your first record using the Entry tab.
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <div key={record.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold">
                      {record.date} at {record.timeCbgTaken} ({record.readingType})
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-bold">{record.glucoseReading} mmol/L</span>
                      {renderGlucoseStatus(record.glucoseReading)}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    Signed: {record.signature}
                  </div>
                </div>
                
                {/* Clinical Notes */}
                {(record.treatmentsGiven || record.commentsForPhysician) && (
                  <div className="border-t pt-3 mt-3 space-y-2">
                    {record.treatmentsGiven && (
                      <div>
                        <div className="font-medium text-sm">Treatments Given:</div>
                        <div className="text-sm text-gray-700">{record.treatmentsGiven}</div>
                      </div>
                    )}
                    {record.commentsForPhysician && (
                      <div>
                        <div className="font-medium text-sm">Comments for Physician:</div>
                        <div className="text-sm text-gray-700">{record.commentsForPhysician}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderTrends = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Glucose Trends (Last 72 Hours)
        </h3>
      </div>
      <div>
        {trendData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No trend data available. Add more records to see trends.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4 bg-gray-50 rounded">
              Chart visualization would appear here with {trendData.length} data points
            </div>
            
            {/* Trend Analysis */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Trend Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium">Latest Reading</div>
                  <div className="text-lg">
                    {trendData[trendData.length - 1]?.glucoseLevel} mmol/L
                  </div>
                </div>
                <div>
                  <div className="font-medium">Readings in Range</div>
                  <div className="text-lg">
                    {trendData.filter(point => point.glucoseLevel >= 5 && point.glucoseLevel <= 10).length} / {trendData.length}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Time in Range</div>
                  <div className="text-lg">
                    {Math.round((trendData.filter(point => point.glucoseLevel >= 5 && point.glucoseLevel <= 10).length / trendData.length) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Auth Error Display */}
      {authError && (
        <div className="p-4 rounded-lg border border-red-500 bg-red-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 font-medium">Authentication Error</p>
          </div>
          <p className="text-red-700 mt-1">Unable to access authentication. Please refresh the page and log in again.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Diabetic Record</h2>
          <p className="text-gray-600">Blood Glucose & Subcutaneous Insulin Record for {patientName}</p>
        </div>
      </div>

      {/* Alert for glucose status */}
      {records.length > 0 && records[0] && (
        <div className={`p-4 rounded-lg border ${
          getGlucoseStatus(records[0].glucoseReading).includes('Critical') 
            ? 'border-red-500 bg-red-50' 
            : getGlucoseStatus(records[0].glucoseReading).includes('High') || getGlucoseStatus(records[0].glucoseReading).includes('Low')
            ? 'border-yellow-500 bg-yellow-50'
            : 'border-green-500 bg-green-50'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <div>
              Latest glucose reading: <strong>{records[0].glucoseReading} mmol/L</strong> - {getGlucoseStatus(records[0].glucoseReading)}
              {getGlucoseStatus(records[0].glucoseReading).includes('Critical') && 
                <div className="mt-1 font-medium">Immediate medical attention may be required!</div>
              }
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'entry'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('entry')}
          >
            New Entry
          </button>
          <button
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
          <button
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trends'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('trends')}
          >
            Trends
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'entry' && renderEntryForm()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'trends' && renderTrends()}
      </div>
    </div>
  );
};

export default DiabeticRecordModule;
