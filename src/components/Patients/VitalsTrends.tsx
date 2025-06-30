import React, { useState, useEffect } from 'react';
import { TrendingUp, X, Calendar, Activity, RefreshCw, BarChart3 } from 'lucide-react';
import { VitalSigns } from '../../types';
import { format, subHours } from 'date-fns';
import { fetchPatientVitalsHistory } from '../../lib/patientService';

interface VitalsTrendsProps {
  currentVitals: VitalSigns;
  patientId: string;
}

interface VitalReading {
  timestamp: string;
  temperature: number;
  heartRate: number;
  bloodPressure: { systolic: number; diastolic: number };
  oxygenSaturation: number;
  respiratoryRate: number;
}

export const VitalsTrends: React.FC<VitalsTrendsProps> = ({ currentVitals, patientId }) => {
  const [showTrends, setShowTrends] = useState(false);
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [readings, setReadings] = useState<VitalReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRealData, setHasRealData] = useState(false);

  // Load vitals history when trends are shown
  useEffect(() => {
    if (showTrends && patientId) {
      loadVitalsHistory();
    }
  }, [showTrends, patientId]);

  const loadVitalsHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const history = await fetchPatientVitalsHistory(patientId);
      
      // Convert database format to component format
      const formattedReadings: VitalReading[] = history.map(vital => ({
        timestamp: vital.recorded_at,
        temperature: vital.temperature,
        heartRate: vital.heart_rate,
        bloodPressure: {
          systolic: vital.blood_pressure_systolic,
          diastolic: vital.blood_pressure_diastolic
        },
        oxygenSaturation: vital.oxygen_saturation,
        respiratoryRate: vital.respiratory_rate
      }));

      // Check if we have real data from the database
      if (formattedReadings.length > 0) {
        setHasRealData(true);
        setReadings(formattedReadings.slice(0, 5)); // Take last 5 readings
      } else {
        setHasRealData(false);
        setReadings([]);
      }
    } catch (err: any) {
      console.error('Error loading vitals history:', err);
      setError(err.message || 'Failed to load vitals history');
      setHasRealData(false);
      setReadings([]);
    } finally {
      setLoading(false);
    }
  };

  const NoDataDisplay: React.FC = () => (
    <div className="col-span-full">
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Vitals History Available</h3>
        <p className="text-gray-600 mb-4">
          Vital signs trends will appear here after the first vitals are recorded for this patient.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md mx-auto">
          <p className="text-blue-800 text-sm">
            <strong>To see trends:</strong> Record vital signs using the "Update Vitals" button, 
            then return here to view historical data and trends.
          </p>
        </div>
      </div>
    </div>
  );

  const MiniChart: React.FC<{ 
    data: number[], 
    label: string, 
    color: string, 
    unit: string,
    onClick: () => void 
  }> = ({ data, label, color, unit, onClick }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return (
      <div 
        className={`bg-white border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all hover:border-${color}-300 h-full`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">{label}</h4>
          <TrendingUp className={`h-4 w-4 text-${color}-500`} />
        </div>
        
        <div className="relative h-16 mb-2">
          <svg className="w-full h-full" viewBox="0 0 100 40">
            <polyline
              fill="none"
              stroke={`currentColor`}
              strokeWidth="2"
              className={`text-${color}-500`}
              points={data.map((value, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = 40 - ((value - min) / range) * 40;
                return `${x},${y}`;
              }).join(' ')}
            />
            {data.map((value, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = 40 - ((value - min) / range) * 40;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="2"
                  className={`fill-${color}-500`}
                />
              );
            })}
          </svg>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>{min.toFixed(1)}{unit}</span>
          <span>{max.toFixed(1)}{unit}</span>
        </div>
      </div>
    );
  };

  const FullChart: React.FC<{ 
    data: number[], 
    label: string, 
    color: string, 
    unit: string,
    timestamps: string[]
  }> = ({ data, label, color, unit, timestamps }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return (
      <div className="bg-white rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{label} Trend</h3>
          <button
            onClick={() => setSelectedChart(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="relative h-64 mb-4">
          <svg className="w-full h-full border border-gray-200 rounded" viewBox="0 0 400 200">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={`v-${i}`}
                x1={i * 100}
                y1={0}
                x2={i * 100}
                y2={200}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            ))}
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i * 50}
                x2={400}
                y2={i * 50}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            ))}
            
            {/* Data line */}
            <polyline
              fill="none"
              stroke={`currentColor`}
              strokeWidth="3"
              className={`text-${color}-500`}
              points={data.map((value, index) => {
                const x = (index / (data.length - 1)) * 400;
                const y = 200 - ((value - min) / range) * 200;
                return `${x},${y}`;
              }).join(' ')}
            />
            
            {/* Data points */}
            {data.map((value, index) => {
              const x = (index / (data.length - 1)) * 400;
              const y = 200 - ((value - min) / range) * 200;
              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    className={`fill-${color}-500`}
                  />
                  <text
                    x={x}
                    y={y - 10}
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                  >
                    {value.toFixed(1)}{unit}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        
        <div className="flex justify-between text-sm text-gray-600">
          {timestamps.map((timestamp, index) => (
            <span key={index} className="text-xs">
              {format(new Date(timestamp), 'MMM dd\nHH:mm')}
            </span>
          ))}
        </div>
      </div>
    );
  };

  if (!showTrends) {
    return (
      <div 
        className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-4 text-center cursor-pointer hover:shadow-md transition-all border-2 border-teal-200 hover:border-teal-300"
        onClick={() => setShowTrends(true)}
      >
        <TrendingUp className="h-8 w-8 text-teal-600 mx-auto mb-2" />
        <p className="text-2xl font-bold text-teal-900">Vitals Trends</p>
        <p className="text-sm text-teal-600">View Historical Data</p>
      </div>
    );
  }

  if (selectedChart && hasRealData && readings.length > 0) {
    const chartData = {
      temperature: {
        data: readings.map(r => r.temperature),
        label: 'Temperature',
        color: 'blue',
        unit: '°F'
      },
      heartRate: {
        data: readings.map(r => r.heartRate),
        label: 'Heart Rate',
        color: 'red',
        unit: ' BPM'
      },
      systolic: {
        data: readings.map(r => r.bloodPressure.systolic),
        label: 'Systolic Blood Pressure',
        color: 'purple',
        unit: ' mmHg'
      },
      diastolic: {
        data: readings.map(r => r.bloodPressure.diastolic),
        label: 'Diastolic Blood Pressure',
        color: 'purple',
        unit: ' mmHg'
      },
      oxygenSaturation: {
        data: readings.map(r => r.oxygenSaturation),
        label: 'Oxygen Saturation',
        color: 'green',
        unit: '%'
      },
      respiratoryRate: {
        data: readings.map(r => r.respiratoryRate),
        label: 'Respiratory Rate',
        color: 'indigo',
        unit: '/min'
      }
    };

    const chart = chartData[selectedChart as keyof typeof chartData];
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-50 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <FullChart
            data={chart.data}
            label={chart.label}
            color={chart.color}
            unit={chart.unit}
            timestamps={readings.map(r => r.timestamp)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-full space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Activity className="h-5 w-5 text-teal-600" />
          <span>Vitals Trends{hasRealData ? ` - Last ${readings.length} Readings` : ''}</span>
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadVitalsHistory}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowTrends(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500">Loading vitals history...</p>
        </div>
      ) : !hasRealData || readings.length === 0 ? (
        <NoDataDisplay />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MiniChart
            data={readings.map(r => r.temperature)}
            label="Temperature"
            color="blue"
            unit="°F"
            onClick={() => setSelectedChart('temperature')}
          />
          
          <MiniChart
            data={readings.map(r => r.heartRate)}
            label="Heart Rate"
            color="red"
            unit=" BPM"
            onClick={() => setSelectedChart('heartRate')}
          />
          
          <MiniChart
            data={readings.map(r => r.bloodPressure.systolic)}
            label="Systolic BP"
            color="purple"
            unit=" mmHg"
            onClick={() => setSelectedChart('systolic')}
          />
          
          <MiniChart
            data={readings.map(r => r.bloodPressure.diastolic)}
            label="Diastolic BP"
            color="purple"
            unit=" mmHg"
            onClick={() => setSelectedChart('diastolic')}
          />
          
          <MiniChart
            data={readings.map(r => r.oxygenSaturation)}
            label="O2 Saturation"
            color="green"
            unit="%"
            onClick={() => setSelectedChart('oxygenSaturation')}
          />
          
          <MiniChart
            data={readings.map(r => r.respiratoryRate)}
            label="Respiratory Rate"
            color="indigo"
            unit="/min"
            onClick={() => setSelectedChart('respiratoryRate')}
          />
        </div>
      )}

      {hasRealData && readings.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <p className="text-blue-800 text-sm font-medium">Reading Timeline</p>
          </div>
          <p className="text-blue-700 text-xs">
            Showing vitals history from database • Click any chart to view detailed trends
          </p>
        </div>
      )}
    </div>
  );
};