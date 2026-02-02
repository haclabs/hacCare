import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Calendar, Settings, UserCheck, BookOpen, FileText, UserPlus, Building2, Database, Play, Shield, ChevronDown, ChevronLeft, ChevronRight, Lock, MonitorPlay, Home } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';
import { SimulationIndicator } from '../../features/simulation/components/SimulationIndicator';
import logo from '../../images/logo.png';

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
  const { currentTenant, programTenants } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItemTop, setActiveItemTop] = useState(0);
  const [activeItemHeight, setActiveItemHeight] = useState(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Persist collapsed state in localStorage
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const navContainerRef = useRef<HTMLDivElement>(null);

  // Get current program info if in program tenant
  const currentProgram = programTenants.find(pt => pt.tenant_id === currentTenant?.id);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
    // Dispatch event so App.tsx can adjust margin
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: isCollapsed } }));
  }, [isCollapsed]);

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
   * Note: Patients is hidden in program tenants since they're instructor workspaces without patient data
   */
  const workspaceItems = [
    // Only show Patients when NOT in a program tenant (program tenants are instructor workspaces)
    ...(currentTenant?.tenant_type !== 'program' ? [
      { id: 'patients', label: 'Patients', icon: Users, color: 'text-blue-600' }
    ] : []),
    { id: 'schedule', label: 'Schedule', icon: Calendar, color: 'text-green-600' },
    { id: 'enter-sim', label: 'Enter Sim', icon: MonitorPlay, color: 'text-cyan-600', route: '/simulation-portal' },
    { id: 'simulations', label: 'Simulations', icon: Play, color: 'text-violet-600', route: '/simulation-portal' },
  ];

  /**
   * Program Management items - show in program tenants for all roles
   * Super admins should see program menus when they switch to a program tenant
   */
  const programItems = (currentTenant?.tenant_type === 'program') ? [
    { id: 'program-home', label: 'Home', icon: Home, color: 'text-blue-600' },
    { id: 'program-students', label: 'Students', icon: Users, color: 'text-purple-600' },
    { id: 'program-settings', label: 'Settings', icon: Settings, color: 'text-gray-600' },
  ] : [];

  /**
   * Admin items - for super admins and coordinators
   */
  const adminItems = hasRole(['super_admin', 'coordinator']) ? [
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
      { id: 'admin', label: 'Admin', icon: Shield, color: 'text-amber-600' },
      { id: 'syslogs', label: 'SysLogs', icon: FileText, color: 'text-red-600' }
    ] : []),
  ];
  return (
    <aside className={`bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen fixed top-0 left-0 transition-all duration-300 ease-in-out flex flex-col overflow-y-auto shadow-xl ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Logo at top of sidebar - Reduced padding */}
      <div className={`transition-all duration-300 ${
        isCollapsed ? 'px-3 py-4' : 'px-6 py-4'
      }`}>
        {isCollapsed ? (
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              HC
            </div>
          </div>
        ) : (
          <img 
            src={logo} 
            alt="HacCare Logo" 
            className="h-auto w-auto transition-all duration-300"
            style={{ height: '70px' }}
          />
        )}
      </div>
      
      {/* Collapse/Expand Button */}
      <div className={`px-3 pb-2 ${
        isCollapsed ? 'flex justify-center' : 'flex justify-end'
      }`}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group relative"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight size={18} className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200" />
          ) : (
            <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200" />
          )}
        </button>
      </div>
      
      {/* Simulation Indicator - Shows when in active simulation */}
      {!isCollapsed && (
        <div className="px-4 pb-2 pt-1">
          <SimulationIndicator />
        </div>
      )}

      {/* Program Context Badge - Shows when in program tenant */}
      {!isCollapsed && currentProgram && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-blue-900 dark:text-blue-100 truncate">
                {currentProgram.program_name}
              </div>
              <div className="text-[10px] text-blue-700 dark:text-blue-300">
                Program Workspace
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="p-5 flex-1 relative" ref={navContainerRef}>
        {/* Animated Active Indicator */}
        <div 
          className="absolute left-0 w-1 bg-gradient-to-b from-blue-500 to-blue-600 rounded-r-full transition-all duration-300 ease-out dark:from-blue-400 dark:to-blue-500 shadow-sm"
          style={{
            top: `${activeItemTop}px`,
            height: `${activeItemHeight}px`,
            opacity: activeItemHeight > 0 ? 1 : 0
          }}
        />
        {/* Workspace Section */}
        <div className="mb-8">
          {!isCollapsed && (
            <div className="px-3 mb-3">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400">
                Workspace
              </span>
            </div>
          )}
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
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    } ${
                      isCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <Icon className={`h-5 w-5 transition-transform duration-200 flex-shrink-0 ${
                      isActive 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : item.color + ' dark:text-gray-400 group-hover:scale-110'
                    }`} />
                    {!isCollapsed && (
                      <span className="text-[15px] font-medium">{item.label}</span>
                    )}
                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
                        {item.label}
                        <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Program Management Section - Only in Program Tenants */}
        {programItems.length > 0 && (
          <div className="mb-8">
            <div className="my-6 border-t border-gray-200 dark:border-gray-800" />
            {!isCollapsed && (
              <div className="px-3 mb-3 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400">
                  Program Management
                </span>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/20 rounded text-purple-600 dark:text-purple-400">
                  <BookOpen size={10} />
                  <span className="text-[9px] font-semibold">{currentProgram?.program_code}</span>
                </div>
              </div>
            )}
            <ul className="space-y-1">
              {programItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onTabChange(item.id);
                        navigate('/app', { replace: false });
                      }}
                      data-active-item={isActive}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      } ${
                        isCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Icon className={`h-5 w-5 transition-transform duration-200 flex-shrink-0 ${
                        isActive 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : item.color + ' dark:text-gray-400 group-hover:scale-110'
                      }`} />
                      {!isCollapsed && (
                        <span className="text-[15px] font-medium">{item.label}</span>
                      )}
                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
                          {item.label}
                          <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/*           </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Admin Section - Only for Super Admins */}
        {adminItems.length > 0 && (
          <div className="mb-8">
            <div className="my-6 border-t border-gray-200 dark:border-gray-800" />
            {!isCollapsed && (
              <div className="px-3 mb-3 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400">
                  Admin
                </span>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 rounded text-orange-600 dark:text-orange-400">
                  <Lock size={10} />
                  <span className="text-[9px] font-semibold">Super Admin</span>
                </div>
              </div>
            )}
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
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      } ${
                        isCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Icon className={`h-5 w-5 transition-transform duration-200 flex-shrink-0 ${
                        isActive 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : item.color + ' dark:text-gray-400 group-hover:scale-110'
                      }`} />
                      {!isCollapsed && (
                        <span className="text-[15px] font-medium">{item.label}</span>
                      )}
                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
                          {item.label}
                          <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* User Profile Dropdown */}
        <div className="mt-auto pt-5 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            title={isCollapsed ? getDisplayName() : undefined}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all duration-200 group ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shadow-md">
                {getUserInitials()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 truncate">{getDisplayName()}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize font-medium">{getRoleDisplay()}</div>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-all duration-200 flex-shrink-0 ${
                    isUserMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </>
            )}
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && !isCollapsed && (
            <div className="mt-2 py-1 space-y-1">
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition-transform duration-150 group-hover:scale-110 ${
                      isActive 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : item.color + ' dark:text-gray-400'
                    }`} />
                    <span className="text-[13px] font-medium">{item.label}</span>
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