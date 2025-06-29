import React from 'react';
import { Bell, User, LogOut, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface HeaderProps {
  unreadAlerts: number;
  onAlertsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ unreadAlerts, onAlertsClick }) => {
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
            <img 
              src="/logo copy.png" 
              alt="HacCare Logo" 
              className="h-12 w-auto object-contain"
              style={{ maxHeight: '48px' }}
              onError={(e) => {
                // Fallback to SVG if PNG fails
                e.currentTarget.src = "/haccare-logo.svg";
              }}
            />
          </div>
        </div>

        <div className="flex items-center space-x-6">
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