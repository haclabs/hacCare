import React from 'react';
import { Bell, User, LogOut, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAlertContext } from '../../hooks/useAlertContext';
import { format } from 'date-fns';
import BarcodeScanner from '../UI/BarcodeScanner';
import { TenantSwitcher } from './TenantSwitcher';
import logo from '../../images/logo.png';

interface HeaderProps {
  onAlertsClick: () => void;
  onBarcodeScan?: (barcode: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onAlertsClick, onBarcodeScan }) => {
  const { profile, signOut } = useAuth();
  const { unreadCount, loading: alertsLoading } = useAlertContext();
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
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {/* HacCare Logo */}
            <div className="flex items-center">
              <img 
                src={logo} 
                alt="HacCare Logo" 
                className="h-auto w-auto"
                style={{ height: '50px' }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Barcode Scanner */}
          {onBarcodeScan && (
            <div className="mr-2 flex items-center space-x-2">
              <div className="flex items-center px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">📱 Barcode Scanner Active</div>
              </div>
              <BarcodeScanner onScan={onBarcodeScan} debug={true} />
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>{currentTime}</span>
          </div>

          {/* Tenant Switcher for Super Admins */}
          <TenantSwitcher />

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