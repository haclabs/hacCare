import React from 'react';
import { Patient, Alert } from '../../types';
import { Users, AlertTriangle, Activity, Clock } from 'lucide-react';

/**
 * QuickStats Component
 * 
 * Displays summary statistics for patients and alerts
 */
interface QuickStatsProps {
  patients: Patient[];
  alerts: Alert[];
}

export const QuickStats: React.FC<QuickStatsProps> = ({ patients, alerts }) => {
  const criticalPatients = patients.filter(p => p.condition === 'Critical').length;
  const activeAlerts = alerts.filter(a => !a.acknowledged).length;
  
  // Count medications due from alerts
  const medicationsDue = alerts.filter(alert => 
    alert.type === 'Medication Due' && !alert.acknowledged
  ).length;
  
  console.log(`QuickStats - Found ${medicationsDue} medication alerts out of ${alerts.length} total alerts`);

  // Define stats cards
  const stats = [
    {
      label: 'Total Patients',
      value: patients.length,
      icon: Users,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30'
    },
    {
      label: 'Critical Patients',
      value: criticalPatients,
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300',
      bgColor: 'bg-red-50 dark:bg-red-900/30'
    },
    {
      label: 'Active Alerts',
      value: activeAlerts,
      icon: Activity,
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300',
      bgColor: 'bg-orange-50 dark:bg-orange-900/30'
    },
    {
      label: 'Medications Due',
      value: medicationsDue, // This should now correctly show the count from alerts
      icon: Clock,
      color: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300',
      bgColor: 'bg-green-50 dark:bg-green-900/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className={`${stat.bgColor} rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};