import React, { useState, useEffect } from 'react';
import { TrendingUp, X, Calendar, Activity, BarChart3, Plus, Trash2, RefreshCw } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { clearPatientVitals } from '../../lib/patientService';
import { usePatients } from '../../contexts/PatientContext';

interface VitalsTrendsProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onRecordVitals: () => void;
}

interface VitalReading {
  timestamp: string;
  temperature: number;
  heartRate: number;
  bloodPressure: { systolic: number; diastolic: number };
  oxygenSaturation: number;
  respiratoryRate: number;
}

const VitalsTrends: React.FC<VitalsTrendsProps> = ({ 
  patientId, 
  patientName, 
  onClose, 
  onRecordVitals 
}) => {
  const [vitals, setVitals] = useState<VitalReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('temperature');
  const { user } = useAuth();
  const { refreshPatients } = usePatients();

  useEffect(() => {
    fetchVitals();
  }, [patientId]);

  const fetchVitals = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('patient_vitals')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      const formattedVitals = data.map(vital => ({
        timestamp: vital.recorded_at,
        temperature: parseFloat(vital.temperature),
        heartRate: vital.heart_rate,
        bloodPressure: {
          systolic: vital.blood_pressure_systolic,
          diastolic: vital.blood_pressure_diastolic
        },
        oxygenSaturation: vital.oxygen_saturation,
        respiratoryRate: vital.respiratory_rate
      }));

      setVitals(formattedVitals);
    } catch (err) {
      console.error('Error fetching vitals:', err);
      setError('Failed to load vital signs data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearVitals = async () => {
    if (!user || !window.confirm('Are you sure you want to clear all vital signs for this patient? This action cannot be undone.')) {
      return;
    }

    try {
      await clearPatientVitals(patientId);
      await fetchVitals();
      await refreshPatients();
    } catch (err) {
      console.error('Error clearing vitals:', err);
      setError('Failed to clear vital signs');
    }
  };

  const getMetricData = (metric: string) => {
    return vitals.map(vital => {
      let value: number;
      switch (metric) {
        case 'temperature':
          value = vital.temperature;
          break;
        case 'heartRate':
          value = vital.heartRate;
          break;
        case 'systolic':
          value = vital.bloodPressure.systolic;
          break;
        case 'diastolic':
          value = vital.bloodPressure.diastolic;
          break;
        case 'oxygenSaturation':
          value = vital.oxygenSaturation;
          break;
        case 'respiratoryRate':
          value = vital.respiratoryRate;
          break;
        default:
          value = 0;
      }
      return {
        timestamp: vital.timestamp,
        value
      };
    });
  };

  const getMetricUnit = (metric: string) => {
    switch (metric) {
      case 'temperature':
        return '°F';
      case 'heartRate':
        return 'bpm';
      case 'systolic':
      case 'diastolic':
        return 'mmHg';
      case 'oxygenSaturation':
        return '%';
      case 'respiratoryRate':
        return '/min';
      default:
        return '';
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'temperature':
        return 'Temperature';
      case 'heartRate':
        return 'Heart Rate';
      case 'systolic':
        return 'Systolic BP';
      case 'diastolic':
        return 'Diastolic BP';
      case 'oxygenSaturation':
        return 'Oxygen Saturation';
      case 'respiratoryRate':
        return 'Respiratory Rate';
      default:
        return '';
    }
  };

  const metrics = [
    { key: 'temperature', label: 'Temperature', icon: Activity },
    { key: 'heartRate', label: 'Heart Rate', icon: Activity },
    { key: 'systolic', label: 'Systolic BP', icon: TrendingUp },
    { key: 'diastolic', label: 'Diastolic BP', icon: TrendingUp },
    { key: 'oxygenSaturation', label: 'O2 Saturation', icon: Activity },
    { key: 'respiratoryRate', label: 'Respiratory Rate', icon: Activity }
  ];

  const metricData = getMetricData(selectedMetric);
  const maxValue = Math.max(...metricData.map(d => d.value));
  const minValue = Math.min(...metricData.map(d => d.value));

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-lg">Loading vital signs...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <BarChart3 className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vital Signs Trends</h2>
              <p className="text-gray-600">{patientName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onRecordVitals}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Record Vitals
            </button>
            <button
              onClick={handleClearVitals}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {vitals.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Vital Signs Recorded</h3>
            <p className="text-gray-600 mb-6">Start recording vital signs to see trends and patterns.</p>
            <button
              onClick={onRecordVitals}
              className="flex items-center mx-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Record First Vitals
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metric Selection */}
            <div className="flex flex-wrap gap-2">
              {metrics.map(metric => {
                const Icon = metric.icon;
                return (
                  <button
                    key={metric.key}
                    onClick={() => setSelectedMetric(metric.key)}
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      selectedMetric === metric.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {metric.label}
                  </button>
                );
              })}
            </div>

            {/* Chart */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getMetricLabel(selectedMetric)} Trend
                </h3>
                <div className="text-sm text-gray-600">
                  Range: {minValue} - {maxValue} {getMetricUnit(selectedMetric)}
                </div>
              </div>

              <div className="relative h-64">
                <svg className="w-full h-full" viewBox="0 0 800 200">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line
                      key={i}
                      x1="0"
                      y1={i * 50}
                      x2="800"
                      y2={i * 50}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Data line */}
                  {metricData.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="3"
                      points={metricData
                        .map((point, index) => {
                          const x = (index / (metricData.length - 1)) * 800;
                          const y = 200 - ((point.value - minValue) / (maxValue - minValue)) * 200;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  )}

                  {/* Data points */}
                  {metricData.map((point, index) => {
                    const x = (index / Math.max(metricData.length - 1, 1)) * 800;
                    const y = 200 - ((point.value - minValue) / Math.max(maxValue - minValue, 1)) * 200;
                    return (
                      <g key={index}>
                        <circle
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#2563eb"
                        />
                        <text
                          x={x}
                          y={y - 10}
                          textAnchor="middle"
                          className="text-xs fill-gray-600"
                        >
                          {point.value}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Time labels */}
              <div className="flex justify-between mt-2 text-xs text-gray-600">
                {metricData.map((point, index) => {
                  if (index % Math.ceil(metricData.length / 6) === 0 || index === metricData.length - 1) {
                    const date = parseISO(point.timestamp);
                    return (
                      <span key={index}>
                        {isValid(date) ? format(date, 'MM/dd HH:mm') : 'Invalid Date'}
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            {/* Recent Readings Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Readings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Temperature
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Heart Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Blood Pressure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        O2 Saturation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Respiratory Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vitals.slice(-10).reverse().map((vital, index) => {
                      const date = parseISO(vital.timestamp);
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isValid(date) ? format(date, 'MM/dd/yyyy HH:mm') : 'Invalid Date'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {vital.temperature}°F
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {vital.heartRate} bpm
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {vital.bloodPressure.systolic}/{vital.bloodPressure.diastolic} mmHg
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {vital.oxygenSaturation}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {vital.respiratoryRate}/min
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VitalsTrends;