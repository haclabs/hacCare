import React from 'react';
import { Users, Calendar, Settings, UserCheck, BookOpen, FileText, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Sidebar Navigation Component
 * 
 * Provides the main navigation menu for the application with role-based visibility.
 * Different menu items are shown based on the user's role and permissions.
 * 
 * Features:
 * - Role-based menu item visibility
 * - Active tab highlighting
 * - Responsive design
 * - Icon-based navigation
 * - Dark mode support
 * 
 * @param {Object} props - Component props
 * @param {string} props.activeTab - Currently active tab identifier
 * @param {Function} props.onTabChange - Callback function when tab changes
 */
interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { hasRole } = useAuth();

  /**
   * Menu items configuration
   * Each item includes id, label, icon, and optional role requirements
   */
  const menuItems = [
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    // Patient Management - Only for Super Admins
    ...(hasRole('super_admin') ? [
      { id: 'patient-management', label: 'Patient Management', icon: UserPlus }
    ] : []),
    // User Management - For Admins and Super Admins
    ...(hasRole(['admin', 'super_admin']) ? [
      { id: 'user-management', label: 'User Management', icon: UserCheck }
    ] : []),
    { id: 'documentation', label: 'Documentation', icon: BookOpen },
    { id: 'changelog', label: 'Changelog', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-64 min-h-screen transition-colors">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};