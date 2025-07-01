import React from 'react';
import { Bell, User, LogOut, Clock, Heart, Database, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface HeaderProps {
  unreadAlerts: number;
  onAlertsClick: () => void;
  dbError?: string | null;
}

export const Header: React.FC<HeaderProps> = ({ unreadAlerts, onAlertsClick, dbError }) => {
  const { profile, signOut } = useAuth();
  const currentTime = format(new Date(), 'MMM dd, yyyy - HH:mm');

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'nurse': return 'Nurse';
      default: return role;
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {/* HacCare Logo with Heart Icon */}
            <div className="flex items-center space-x-3">
              {/* Heart Icon */}
              <div className="relative">
                <Heart 
                  className="h-10 w-10 text-blue-600 fill-current" 
                  strokeWidth={1.5}
                />
                {/* Heartbeat line overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg 
                    className="h-4 w-4 text-white" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M3 12h3l2-4 4 8 2-4h3" />
                  </svg>
                </div>
              </div>
              
              {/* HacCare Text */}
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-800 leading-none">
                  haccare
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  patient record system
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Database Status Indicator */}
          <div className="flex items-center space-x-2">
            {dbError ? (
              <div className="flex items-center space-x-2 px-3 py-1 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700 font-medium">DB Disconnected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                <Database className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">DB Connected</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{currentTime}</span>
          </div>

          <button
            onClick={onAlertsClick}
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadAlerts > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadAlerts}
              </span>
            )}
          </button>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-gray-500">
                {getRoleLabel(profile?.role || '')} • {profile?.department || 'No Department'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 p-2 rounded-full">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <button 
                onClick={signOut}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};