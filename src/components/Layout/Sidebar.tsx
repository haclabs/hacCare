import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Calendar, Settings, UserCheck, BookOpen, FileText, UserPlus, Building2, Database, Play, Shield, ChevronDown, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { SimulationIndicator } from '../../features/simulation/components/SimulationIndicator';

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
  const { hasRole, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItemTop, setActiveItemTop] = useState(0);
  const [activeItemHeight, setActiveItemHeight] = useState(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);

  // Update active indicator position when activeTab changes
  useEffect(() => {
    const activeElement = document.querySelector('[data-active-item="true"]');
    if (activeElement && navContainerRef.current) {
      const rect = activeElement.getBoundingClientRect();
      const containerRect = navContainerRef.current.getBoundingClientRect();
      setActiveItemTop(rect.top - containerRect.top);
      setActiveItemHeight(rect.height);
    }
  }, [activeTab, location.pathname]);

  // Get user display info
  const getUserInitials = () => {
    if (!profile) return 'U';
    const first = profile.first_name?.[0] || '';
    const last = profile.last_name?.[0] || '';
    return (first + last).toUpperCase() || profile.email?.[0]?.toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (!profile) return 'User';
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'User';
  };

  const getRoleDisplay = () => {
    if (!profile?.role) return 'User';
    return profile.role.replace('_', ' ');
  };

  /**
   * Workspace items - available to all users
   */
  const workspaceItems = [
    { id: 'patients', label: 'Patients', icon: Users, color: 'text-blue-600' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, color: 'text-green-600' },
    { id: 'enter-sim', label: 'Enter Sim', icon: Play, color: 'text-violet-600', route: '/simulation-portal' },
    ...(hasRole(['admin', 'super_admin']) ? [
      { id: 'simulations', label: 'Simulations', icon: Play, color: 'text-violet-600' }
    ] : []),
  ];

  /**
   * Admin items - only for super admins
   */
  const adminItems = hasRole('super_admin') ? [
    { id: 'patient-management', label: 'Patient Templates', icon: UserPlus, color: 'text-purple-600' },
    { id: 'user-management', label: 'User & Roles', icon: UserCheck, color: 'text-indigo-600' },
    { id: 'management', label: 'Tenant Mgmt', icon: Building2, color: 'text-red-600' },
    { id: 'backup-management', label: 'Backups', icon: Database, color: 'text-emerald-600' },
    { id: 'documentation', label: 'Documentation', icon: BookOpen, color: 'text-orange-600' },
    { id: 'changelog', label: 'Changelog', icon: FileText, color: 'text-teal-600' },
  ] : [];

  /**
   * User dropdown items
   */
  const userDropdownItems = [
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-gray-600' },
    ...(hasRole('super_admin') ? [
      { id: 'admin', label: 'Admin', icon: Shield, color: 'text-amber-600' }
    ] : []),
  ];
  return (
    <aside className="bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-64 min-h-screen transition-colors flex flex-col">
      {/* Simulation Indicator - Shows when in active simulation */}
      <div className="pt-4">
        <SimulationIndicator />
      </div>

      <nav className="p-4 flex-1 relative" ref={navContainerRef}>
        {/* Animated Active Indicator */}
        <div 
          className="absolute left-0 w-1 bg-gradient-to-b from-blue-500 to-blue-600 rounded-r-full transition-all duration-300 ease-out dark:from-blue-400 dark:to-blue-500"
          style={{
            top: `${activeItemTop}px`,
            height: `${activeItemHeight}px`,
            opacity: activeItemHeight > 0 ? 1 : 0
          }}
        />
        {/* Workspace Section */}
        <div className="mb-6">
          <div className="px-4 mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Workspace
            </span>
          </div>
          <ul className="space-y-1">
            {workspaceItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      if ('route' in item && item.route) {
                        const appRoute = item.route.startsWith('/') 
                          ? `/app${item.route}` 
                          : `/app/${item.route}`;
                        navigate(appRoute);
                      } else {
                        onTabChange(item.id);
                        navigate('/app', { replace: false });
                      }
                    }}
                    data-active-item={isActive}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70'
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition-transform duration-200 ${
                      isActive 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : item.color + ' dark:text-gray-400 group-hover:scale-110'
                    }`} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Admin Section - Only for Super Admins */}
        {adminItems.length > 0 && (
          <div className="mb-6">
            <div className="my-6 border-t border-gray-200 dark:border-gray-700" />
            <div className="px-4 mb-2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                Admin
              </span>
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <Lock size={10} />
                <span className="text-[9px] font-semibold">Super Admin</span>
              </div>
            </div>
            <ul className="space-y-1">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if ('route' in item && item.route) {
                          const appRoute = item.route.startsWith('/') 
                            ? `/app${item.route}` 
                            : `/app/${item.route}`;
                          navigate(appRoute);
                        } else {
                          onTabChange(item.id);
                          navigate('/app', { replace: false });
                        }
                      }}
                      data-active-item={isActive}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70'
                      }`}
                    >
                      <Icon className={`h-4 w-4 transition-transform duration-200 ${
                        isActive 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : item.color + ' dark:text-gray-400 group-hover:scale-110'
                      }`} />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* User Profile Dropdown */}
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 px-1">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-all duration-200 group"
          >
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                {getUserInitials()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{getDisplayName()}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{getRoleDisplay()}</div>
            </div>
            <ChevronDown 
              size={16} 
              className={`text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-all duration-200 flex-shrink-0 ${
                isUserMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="mt-2 py-1 space-y-0.5">
              {userDropdownItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onTabChange(item.id);
                      navigate('/app', { replace: false });
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all duration-150 group ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 transition-transform duration-150 group-hover:scale-110 ${
                      isActive 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : item.color + ' dark:text-gray-400'
                    }`} />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
};