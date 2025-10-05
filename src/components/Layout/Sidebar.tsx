import React from 'react';
import { Users, Calendar, Settings, UserCheck, BookOpen, FileText, UserPlus, Building2, Database, Play, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

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
   * Menu items configuration with colored icons
   * Each item includes id, label, icon, color, and optional role requirements
   */
  const menuItems = [
    { id: 'patients', label: 'Patients', icon: Users, color: 'text-blue-600' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, color: 'text-green-600' },
    // Simulations - Only for Admins and Super Admins
    ...(hasRole(['admin', 'super_admin']) ? [
      { id: 'simulations', label: 'Simulations', icon: Play, color: 'text-violet-600' }
    ] : []),
    // Management Dashboard - Only for Super Admins
    ...(hasRole('super_admin') ? [
      { id: 'management', label: 'Management', icon: Building2, color: 'text-red-600' }
    ] : []),
    // Admin Dashboard - For Admins and Super Admins
    ...(hasRole(['admin', 'super_admin']) ? [
      { id: 'admin', label: 'Admin', icon: Shield, color: 'text-amber-600' }
    ] : []),
    // Patient Management - Only for Super Admins
    ...(hasRole('super_admin') ? [
      { id: 'patient-management', label: 'Patient Management', icon: UserPlus, color: 'text-purple-600' }
    ] : []),
    // User Management - For Admins and Super Admins
    ...(hasRole(['admin', 'super_admin']) ? [
      { id: 'user-management', label: 'User Management', icon: UserCheck, color: 'text-indigo-600' }
    ] : []),
    // Backup Management - Only for Super Admins
    ...(hasRole('super_admin') ? [
      { id: 'backup-management', label: 'Backup Management', icon: Database, color: 'text-emerald-600' }
    ] : []),
    { id: 'documentation', label: 'Documentation', icon: BookOpen, color: 'text-orange-600' },
    { id: 'changelog', label: 'Changelog', icon: FileText, color: 'text-teal-600' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-gray-600' },
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
                      ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${
                    isActive 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : item.color + ' dark:text-gray-400'
                  }`} />
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