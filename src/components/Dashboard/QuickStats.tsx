import React from 'react';
import { Patient, Alert } from '../../types';
import { Users, AlertTriangle, Activity, Clock } from 'lucide-react';

interface QuickStatsProps {
  patients: Patient[];
  alerts: Alert[];
}

export const QuickStats: React.FC<QuickStatsProps> = ({ patients, alerts }) => {
  const criticalPatients = patients.filter(p => p.condition === 'Critical').length;
  const activeAlerts = alerts.filter(a => !a.acknowledged).length;
  const medicationsDue = patients.reduce((count, patient) => {
    const dueSoon = patient.medications.filter(med => {
      const dueTime = new Date(med.nextDue);
      const now = new Date();
      const timeDiff = dueTime.getTime() - now.getTime();
      return timeDiff <= 60 * 60 * 1000 && timeDiff > 0; // Due within 1 hour
    });
    return count + dueSoon.length;
  }, 0);

  const stats = [
    {
      label: 'Total Patients',
      value: patients.length,
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Critical Patients',
      value: criticalPatients,
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      label: 'Active Alerts',
      value: activeAlerts,
      icon: Activity,
      color: 'bg-orange-100 text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      label: 'Medications Due',
      value: medicationsDue,
      icon: Clock,
      color: 'bg-green-100 text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className={`${stat.bgColor} rounded-lg p-6 border border-gray-200`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
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