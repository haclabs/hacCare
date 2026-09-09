import React, { useState, useEffect } from 'react';
import { User, LogOut, Clock, BookOpen, AlertTriangle, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';
import { format } from 'date-fns';
import BarcodeScanner from '../UI/BarcodeScanner';
import { TenantSwitcher } from './TenantSwitcher';
import { HacCareLogo } from './HacCareLogo';

/** Matches the mint accent used across the login page / HacCareLogo / WelcomeModal. */
const MINT = '#3fbf9a';
const MINT_DARK = '#2f9e80';

interface HeaderProps {
  onAlertsClick?: () => void;
  onBarcodeScan?: (barcode: string) => void;
  sidebarCollapsed?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onBarcodeScan, sidebarCollapsed = false }) => {
  const { profile, signOut } = useAuth();
  const { currentTenant, programTenants } = useTenant();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProgramSwitcher, setShowProgramSwitcher] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleSwitchProgram = (tenantId: string) => {
    // Save preference to localStorage, then reload to trigger TenantContext to load it
    localStorage.setItem('current_program_tenant', tenantId);
    window.location.reload();
  };

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
      case 'coordinator': return 'Coordinator';
      case 'admin': return 'Admin';
      case 'instructor': return 'Instructor';
      case 'nurse': return 'Nurse';
      default: return role;
    }
  };

  // Check if editing a template — read the template's own name/kind directly
  // instead of currentTenant.name, which can go stale/verbose if the template
  // was ever renamed without the tenant row being updated to match.
  const editingTemplateInfo = (() => {
    const stored = sessionStorage.getItem('editing_template');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as { template_name: string; kind?: 'simulation' | 'patient' };
    } catch {
      return null;
    }
  })();

  // Get current context (Program, Simulation, or Tenant)
  const currentProgram = programTenants.find(pt => pt.tenant_id === currentTenant?.id);
  const contextName = currentProgram 
    ? currentProgram.program_name 
    : editingTemplateInfo
      ? editingTemplateInfo.template_name
      : currentTenant?.is_simulation 
        ? `Simulation: ${currentTenant.name}`
        : currentTenant?.name || 'Loading...';

  const contextType = editingTemplateInfo
    ? editingTemplateInfo.kind === 'patient' ? 'Editing Patient Template' : 'Editing Template'
    : currentProgram 
      ? 'Program Workspace' 
      : currentTenant?.is_simulation 
        ? 'Active Simulation'
        : 'Workspace';

  return (
    <>
    <header className={`fixed top-0 left-0 right-0 z-40 h-16 flex items-stretch border-b border-black/30 transition-all duration-300 shadow-lg`} style={{ backgroundColor: '#2a2a28' }}>
      {/* Logo panel - matches sidebar width so the two columns line up */}
      <div className={`flex items-center justify-center flex-shrink-0 border-r border-white/10 transition-all duration-300 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        {sidebarCollapsed ? (
          <HacCareLogo variant="dark" size="20px" />
        ) : (
          <HacCareLogo variant="dark" size="30px" withBar />
        )}
      </div>

      <div className="flex items-center justify-between flex-1 min-w-0 gap-4 px-6 lg:px-8 xl:px-12">
        {/* Left: Context Info */}
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-white" />
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-slate-300 font-medium">{contextType}</span>
              <span className="text-sm font-bold text-white">{contextName}</span>
            </div>
          </div>
          
          {currentProgram && (
            <span className="px-2 py-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded text-xs font-semibold text-white">
              {currentProgram.program_code}
            </span>
          )}

          {currentProgram && programTenants.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowProgramSwitcher(!showProgramSwitcher)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg transition-colors text-xs font-semibold text-white"
              >
                Switch Program
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showProgramSwitcher ? 'rotate-180' : ''}`} />
              </button>

              {showProgramSwitcher && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProgramSwitcher(false)} />
                  <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20">
                    <div className="p-2">
                      {programTenants.map((program) => {
                        const isCurrent = program.tenant_id === currentTenant?.id;
                        return (
                          <button
                            key={program.tenant_id}
                            onClick={() => {
                              if (!isCurrent) {
                                handleSwitchProgram(program.tenant_id);
                              }
                              setShowProgramSwitcher(false);
                            }}
                            disabled={isCurrent}
                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                              isCurrent
                                ? 'bg-[#3fbf9a]/10 cursor-default'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="flex items-center justify-center w-10 h-10 rounded-lg text-white font-bold text-sm"
                                style={{ background: isCurrent ? `linear-gradient(135deg, ${MINT} 0%, ${MINT_DARK} 100%)` : '#9ca3af' }}
                              >
                                {program.program_code.substring(0, 2)}
                              </div>
                              <div className="text-left">
                                <div className="font-medium text-gray-900 dark:text-white text-sm">
                                  {program.program_name}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {program.program_code}
                                </div>
                              </div>
                            </div>
                            {isCurrent && (
                              <Check className="h-5 w-5 text-[#3fbf9a]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Center: Barcode Scanner & Clock */}
        <div className="flex items-center gap-6">
          {/* Barcode Scanner */}
          {onBarcodeScan && (
            <div className="flex items-center gap-2">
              <div 
                className="relative p-2 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors group"
                title="Barcode Scanner Active"
              >
                <svg 
                  className="w-5 h-5 text-white" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2v-2zM15 15h2v2h-2v-2zM13 17h2v2h-2v-2zM15 19h2v2h-2v-2zM17 13h2v2h-2v-2zM19 15h2v2h-2v-2zM17 17h2v2h-2v-2zM19 19h2v2h-2v-2z"/>
                </svg>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <BarcodeScanner onScan={onBarcodeScan} debug={true} />
            </div>
          )}
          
          {/* Clock */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
            <Clock className="h-4 w-4 text-white" />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold text-white tracking-tight font-mono">
                {format(currentTime, 'HH:mm:ss')}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {format(currentTime, 'MMM dd, yyyy')}
              </span>
            </div>
          </div>

          {/* Tenant Switcher for Super Admins */}
          <TenantSwitcher />
        </div>

        {/* Right: User Info */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-slate-300 font-medium mb-0.5">Logged in as</p>
            <p className="text-sm font-bold text-white">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-slate-300 flex items-center gap-1">
              {getRoleLabel(profile?.role || '')}
              {currentProgram && (
                <>
                  <span className="text-slate-400">•</span>
                  <span>{currentProgram.program_code}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full border border-white/30">
              <User className="h-4 w-4 text-white" />
            </div>
            <button 
              onClick={handleLogoutClick}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>

    {/* Shared-account logout confirmation */}
    {showLogoutConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border-4 border-red-400">
          <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center gap-3 rounded-t-xl">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-red-900">Sign Out Warning</h3>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-700">
              This account may be shared across multiple devices. Signing out will immediately disconnect <span className="font-semibold text-red-700">all users</span> currently logged in with this account — including students in other active simulations.
            </p>
            <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3">
              <p className="text-sm font-semibold text-red-800">
                If you're not sure, check with your instructor before signing out.
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg transition-colors"
              >
                Cancel — Stay Logged In
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); signOut(); }}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Sign Out Anyway
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};