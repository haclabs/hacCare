import React, { useState, useEffect } from 'react';
import { TrendingUp, X, Calendar, Activity, BarChart3, Plus, Trash2, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { clearPatientVitals } from '../../lib/patientService';
import { usePatients } from '../../contexts/PatientContext';

interface VitalsTrendsProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
}

interface VitalReading {
  timestamp: string;
  temperature: number;
  heartRate: number;
  bloodPressure: { systolic: number; diastolic: number };
  oxygenSaturation: number;
  respiratoryRate: number;
}

export const VitalsTrends: React.FC<VitalsTrendsProps> = ({ patientId, patientName, onClose }) => {
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [readings, setReadings] = useState<VitalReading[]>([]);
  const [clearingVitals, setClearingVitals] = useState(false);
  const [loading, setLoading] = useState(true);
  const { hasRole } = useAuth();
  const { refreshPatients } = usePatients();

  useEffect(() => {
    fetchVitalsData();
  }, [patientId]);

  const fetchVitalsData = async () => {
    try {
      setLoading(true);
      
      // Fetch vitals from Supabase
      const { data: vitalsData, error } = await supabase
        .from('patient_vitals')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching vitals data:', error);
        setReadings([]);
        return;
      }
      
      if (!vitalsData || vitalsData.length === 0) {
        console.log('No vitals data found for patient:', patientId);
        setReadings([]);
        return;
      }
      
      console.log('Raw vitals data:', vitalsData);
      
      // Convert database format to component format
      const formattedReadings: VitalReading[] = vitalsData.map(vital => ({
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
      
      console.log('Formatted readings:', formattedReadings);
      
      // Take only last 5 readings
      setReadings(formattedReadings.slice(0, 5));
    } catch (error) {
      console.error('Error in fetchVitalsData:', error);
      setReadings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearVitals = async () => {
    if (!hasRole('super_admin')) {
      alert('Only super administrators can clear vital records.');
      return;
    }

    if (!confirm('Are you sure you want to clear ALL vital records for this patient? This action cannot be undone.')) {
      return;
    }

    try {
      setClearingVitals(true);
      
      // Clear vitals from database
      await clearPatientVitals(patientId);
      
      // Clear local state
      setReadings([]);
      
      // Refresh patient data in context
      await refreshPatients();
      
      alert('All vital records have been cleared successfully.');
    } catch (error: any) {
      console.error('Error clearing vitals:', error);
      alert(`Failed to clear vital records: ${error.message || 'Unknown error'}. This may be due to insufficient permissions.`);
    } finally {
      setClearingVitals(false);
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
            <strong>To see trends:</strong> Record vital signs using the "Record Vitals" button, 
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
    if (data.length === 0) return null;

    // For a single reading, create a flat line with two identical points
    const displayData = data.length === 1 ? [data[0], data[0]] : data;
    
    const max = Math.max(...displayData);
    const min = Math.min(...displayData);
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
              points={displayData.map((value, index) => {
                const x = (index / (displayData.length - 1)) * 100;
                const y = 40 - ((value - min) / range) * 40;
                return `${x},${y}`;
              }).join(' ')}
            />
            {displayData.map((value, index) => {
              const x = (index / (displayData.length - 1)) * 100;
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
    // For a single reading, create a flat line with two identical points
    const displayData = data.length === 1 ? [data[0], data[0]] : data;
    const displayTimestamps = timestamps.length === 1 ? 
      [timestamps[0], format(new Date(new Date(timestamps[0]).getTime() + 3600000), 'yyyy-MM-dd HH:mm:ss')] : 
      timestamps;
    
    const max = Math.max(...displayData);
    const min = Math.min(...displayData);
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
              points={displayData.map((value, index) => {
                const x = (index / (displayData.length - 1)) * 400;
                const y = 200 - ((value - min) / range) * 200;
                return `${x},${y}`;
              }).join(' ')}
            />
            
            {/* Data points */}
            {displayData.map((value, index) => {
              const x = (index / (displayData.length - 1)) * 400;
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
          {displayTimestamps.map((timestamp, index) => (
            <span key={index} className="text-xs">
              {format(parseISO(timestamp), 'MMM dd\nHH:mm')}
            </span>
          ))}
        </div>
      </div>
    );
  };

  if (selectedChart && readings.length > 0) {
    const chartData = {
      temperature: {
        data: readings.map(r => r.temperature),
        label: 'Temperature',
        color: 'red',
        unit: '°F'
      },
      heartRate: {
        data: readings.map(r => r.heartRate),
        label: 'Heart Rate',
        color: 'green',
        unit: ' BPM'
      },
      systolic: {
        data: readings.map(r => r.bloodPressure.systolic),
        label: 'Systolic Blood Pressure',
        color: 'blue',
        unit: ' mmHg'
      },
      diastolic: {
        data: readings.map(r => r.bloodPressure.diastolic),
        label: 'Diastolic Blood Pressure',
        color: 'blue',
        unit: ' mmHg'
      },
      oxygenSaturation: {
        data: readings.map(r => r.oxygenSaturation),
        label: 'Oxygen Saturation',
        color: 'teal',
        unit: '%'
      },
      respiratoryRate: {
        data: readings.map(r => r.respiratoryRate),
        label: 'Respiratory Rate',
        color: 'purple',
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Vital Signs Trends - {patientName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Vital Signs History</h3>
            <div className="flex space-x-3">
              <button
                onClick={fetchVitalsData}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              
              {hasRole('super_admin') && (
                <button
                  onClick={handleClearVitals}
                  disabled={clearingVitals || readings.length === 0}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{clearingVitals ? 'Clearing...' : 'Clear All'}</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">Loading vital signs data...</p>
            </div>
          ) : readings.length === 0 ? (
            <NoDataDisplay />
          ) : (
            <div className="space-y-6">
              {/* Last 5 Readings Summary */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Last {Math.min(5, readings.length)} Readings</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temp (°F)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HR (BPM)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BP (mmHg)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">O2 (%)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RR (/min)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {readings.map((reading, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(parseISO(reading.timestamp), 'MMM dd, HH:mm')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {reading.temperature.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {reading.heartRate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {reading.bloodPressure.systolic}/{reading.bloodPressure.diastolic}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {reading.oxygenSaturation}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {reading.respiratoryRate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Trend Charts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MiniChart
                  data={readings.map(r => r.temperature)}
                  label="Temperature"
                  color="red"
                  unit="°F"
                  onClick={() => setSelectedChart('temperature')}
                />
                
                <MiniChart
                  data={readings.map(r => r.heartRate)}
                  label="Heart Rate"
                  color="green"
                  unit=" BPM"
                  onClick={() => setSelectedChart('heartRate')}
                />
                
                <MiniChart
                  data={readings.map(r => r.bloodPressure.systolic)}
                  label="Systolic BP"
                  color="blue"
                  unit=" mmHg"
                  onClick={() => setSelectedChart('systolic')}
                />
                
                <MiniChart
                  data={readings.map(r => r.bloodPressure.diastolic)}
                  label="Diastolic BP"
                  color="blue"
                  unit=" mmHg"
                  onClick={() => setSelectedChart('diastolic')}
                />
                
                <MiniChart
                  data={readings.map(r => r.oxygenSaturation)}
                  label="O2 Saturation"
                  color="teal"
                  unit="%"
                  onClick={() => setSelectedChart('oxygenSaturation')}
                />
                
                <MiniChart
                  data={readings.map(r => r.respiratoryRate)}
                  label="Respiratory Rate"
                  color="purple"
                  unit="/min"
                  onClick={() => setSelectedChart('respiratoryRate')}
                />
              </div>

              {/* Trend Analysis */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Trend Analysis</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Temperature Trend */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Temperature</h4>
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    </div>
                    
                    {readings.length >= 2 && (
                      <div>
                        {readings[0].temperature > readings[1].temperature ? (
                          <p className="text-sm text-orange-600">
                            <span className="font-medium">Increasing</span> - Up {(readings[0].temperature - readings[1].temperature).toFixed(1)}°F from previous reading
                          </p>
                        ) : readings[0].temperature < readings[1].temperature ? (
                          <p className="text-sm text-green-600">
                            <span className="font-medium">Decreasing</span> - Down {(readings[1].temperature - readings[0].temperature).toFixed(1)}°F from previous reading
                          </p>
                        ) : (
                          <p className="text-sm text-blue-600">
                            <span className="font-medium">Stable</span> - No change from previous reading
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-1">
                          Normal range: 97.0°F - 99.0°F
                        </p>
                      </div>
                    )}
                    
                    {readings.length === 1 && (
                      <div>
                        <p className="text-sm text-blue-600">
                          <span className="font-medium">Single Reading</span> - {readings[0].temperature.toFixed(1)}°F
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Normal range: 97.0°F - 99.0°F
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Heart Rate Trend */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Heart Rate</h4>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    
                    {readings.length >= 2 && (
                      <div>
                        {readings[0].heartRate > readings[1].heartRate ? (
                          <p className="text-sm text-orange-600">
                            <span className="font-medium">Increasing</span> - Up {readings[0].heartRate - readings[1].heartRate} BPM from previous reading
                          </p>
                        ) : readings[0].heartRate < readings[1].heartRate ? (
                          <p className="text-sm text-green-600">
                            <span className="font-medium">Decreasing</span> - Down {readings[1].heartRate - readings[0].heartRate} BPM from previous reading
                          </p>
                        ) : (
                          <p className="text-sm text-blue-600">
                            <span className="font-medium">Stable</span> - No change from previous reading
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-1">
                          Normal range: 60-100 BPM
                        </p>
                      </div>
                    )}
                    
                    {readings.length === 1 && (
                      <div>
                        <p className="text-sm text-blue-600">
                          <span className="font-medium">Single Reading</span> - {readings[0].heartRate} BPM
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Normal range: 60-100 BPM
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Blood Pressure Trend */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Blood Pressure</h4>
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                    </div>
                    
                    {readings.length >= 2 && (
                      <div>
                        {readings[0].bloodPressure.systolic > readings[1].bloodPressure.systolic ? (
                          <p className="text-sm text-orange-600">
                            <span className="font-medium">Systolic Increasing</span> - Up {readings[0].bloodPressure.systolic - readings[1].bloodPressure.systolic} mmHg
                          </p>
                        ) : readings[0].bloodPressure.systolic < readings[1].bloodPressure.systolic ? (
                          <p className="text-sm text-green-600">
                            <span className="font-medium">Systolic Decreasing</span> - Down {readings[1].bloodPressure.systolic - readings[0].bloodPressure.systolic} mmHg
                          </p>
                        ) : (
                          <p className="text-sm text-blue-600">
                            <span className="font-medium">Systolic Stable</span> - No change
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-1">
                          {"Normal range: Systolic <120 mmHg, Diastolic <80 mmHg"}
                        </p>
                      </div>
                    )}
                    
                    {readings.length === 1 && (
                      <div>
                        <p className="text-sm text-blue-600">
                          <span className="font-medium">Single Reading</span> - {readings[0].bloodPressure.systolic}/{readings[0].bloodPressure.diastolic} mmHg
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {"Normal range: Systolic <120 mmHg, Diastolic <80 mmHg"}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Oxygen Saturation Trend */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Oxygen Saturation</h4>
                      <TrendingUp className="h-4 w-4 text-teal-500" />
                    </div>
                    
                    {readings.length >= 2 && (
                      <div>
                        {readings[0].oxygenSaturation > readings[1].oxygenSaturation ? (
                          <p className="text-sm text-green-600">
                            <span className="font-medium">Improving</span> - Up {readings[0].oxygenSaturation - readings[1].oxygenSaturation}% from previous reading
                          </p>
                        ) : readings[0].oxygenSaturation < readings[1].oxygenSaturation ? (
                          <p className="text-sm text-orange-600">
                            <span className="font-medium">Decreasing</span> - Down {readings[1].oxygenSaturation - readings[0].oxygenSaturation}% from previous reading
                          </p>
                        ) : (
                          <p className="text-sm text-blue-600">
                            <span className="font-medium">Stable</span> - No change from previous reading
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-1">
                          Normal range: 95-100%
                        </p>
                      </div>
                    )}
                    
                    {readings.length === 1 && (
                      <div>
                        <p className="text-sm text-blue-600">
                          <span className="font-medium">Single Reading</span> - {readings[0].oxygenSaturation}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Normal range: 95-100%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <p className="text-blue-800 text-sm font-medium">Reading Timeline</p>
                </div>
                <p className="text-blue-700 text-xs">
                  Showing {readings.length > 5 ? 5 : readings.length} of {readings.length} vitals readings • Click any chart to view detailed trends
                </p>
                <p className="text-blue-700 text-xs mt-1">
                  Trends are calculated based on the most recent readings • Record new vitals to update trends
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};