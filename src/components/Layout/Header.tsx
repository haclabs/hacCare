import React, { useState, useEffect } from 'react';
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
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'nurse': return 'Nurse';
      default: return role;
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-8 xl:px-12 py-4 transition-colors shadow-sm">
      <div className="flex items-center w-full gap-4">
        {/* Left: Logo */}
        <div className="flex items-center flex-shrink-0">
          <img 
            src={logo} 
            alt="HacCare Logo" 
            className="h-auto w-auto"
            style={{ height: '65px' }}
          />
        </div>

        {/* Center: Controls (grows to fill space, centered) */}
        <div className="flex items-center justify-center flex-1 space-x-3 lg:space-x-6 xl:space-x-8">
          {/* Barcode Scanner - Compact Icon */}
          {onBarcodeScan && (
            <div className="flex items-center space-x-2">
              <div 
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                title="Barcode Scanner Active"
              >
                {/* QR Code / Scanner Icon */}
                <svg 
                  className="w-5 h-5 text-green-600 dark:text-green-400" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2v-2zM15 15h2v2h-2v-2zM13 17h2v2h-2v-2zM15 19h2v2h-2v-2zM17 13h2v2h-2v-2zM19 15h2v2h-2v-2zM17 17h2v2h-2v-2zM19 19h2v2h-2v-2z"/>
                </svg>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                
                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Barcode Scanner Active
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                </div>
              </div>
              <BarcodeScanner onScan={onBarcodeScan} debug={true} />
            </div>
          )}
          
          <div className="flex items-center space-x-3 px-2">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight font-mono">
                {format(currentTime, 'HH:mm:ss')}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                {format(currentTime, 'MMM dd, yyyy')}
              </span>
            </div>
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
        </div>

        {/* Right: User Profile */}
        <div className="flex items-center space-x-3 flex-shrink-0">
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
    </header>
  );
};