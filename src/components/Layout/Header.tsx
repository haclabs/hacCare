import React from 'react';
import { Bell, User, LogOut, Clock, Database, AlertTriangle, WifiOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAlerts } from '../../hooks/useAlerts';
import { usePatients } from '../../hooks/usePatients';
import { format } from 'date-fns';
import BarcodeScanner from '../UI/BarcodeScanner';

interface HeaderProps {
  onAlertsClick: () => void;
  dbError?: string | null;
  onBarcodeScan?: (barcode: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onAlertsClick, dbError, onBarcodeScan }) => {
  const { profile, signOut } = useAuth();
  const { unreadCount, loading: alertsLoading } = useAlerts();
  const { } = usePatients();
  const currentTime = format(new Date(), 'MMM dd, yyyy - HH:mm');
  const isOffline = false; // Remove offline logic for now

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'nurse': return 'Nurse';
      default: return role;
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {/* HacCare Logo Text Only */}
            <div className="flex items-center">
              {/* HacCare Text */}
              <div className="text-left">
                <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100 leading-none">
                  haccare
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  patient record system
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Barcode Scanner */}
          {onBarcodeScan && (
            <div className="mr-2">
              <BarcodeScanner onScan={onBarcodeScan} />
            </div>
          )}
          
          {isOffline && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-xs">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <span>Offline Mode</span>
            </div>
          )}

          {/* Database Status Indicator */}
          <div className="flex items-center space-x-2">
            {isOffline ? (
              <div className="flex items-center space-x-2 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">Connection Error</span>
              </div>
            ) : dbError ? (
              <div className="flex items-center space-x-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-700 dark:text-red-300 font-medium">DB Disconnected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <Database className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300 font-medium">DB Connected</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>{currentTime}</span>
          </div>

          <button
            onClick={onAlertsClick}
            className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {alertsLoading && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </span>
            )}
          </button>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {getRoleLabel(profile?.role || '')} • {profile?.department || 'No Department'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <button 
                onClick={signOut}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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