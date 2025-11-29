/**
 * Simulation Indicator - Shows when user is in an active simulation
 * 
 * Displays in the sidebar with:
 * - Simulation name
 * - Time remaining (countdown)
 * - Visual indicator (pulsing badge)
 */

import React, { useEffect, useState } from 'react';
import { Monitor, Clock, AlertCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../../contexts/TenantContext';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/api/supabase';

interface SimulationInfo {
  id: string;
  name: string;
  ends_at: string;
  status: string;
}

export const SimulationIndicator: React.FC = () => {
  const { currentTenant, exitSimulationTenant } = useTenant();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [simulation, setSimulation] = useState<SimulationInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [gracePeriodEnd, setGracePeriodEnd] = useState<number | null>(null);
  const [graceTimeRemaining, setGraceTimeRemaining] = useState<string>('');

  const handleExitSimulation = async () => {
    if (window.confirm('Are you sure you want to exit this simulation?')) {
      try {
        setIsExiting(true);
        await exitSimulationTenant();
        // Navigate to simulation portal for simulation_only users, otherwise home
        if (profile?.simulation_only) {
          window.location.href = '/app/simulation-portal';
        } else {
          window.location.href = '/app';
        }
      } catch (error) {
        console.error('Error exiting simulation:', error);
        alert('Failed to exit simulation. Please try again.');
        setIsExiting(false);
      }
    }
  };

  useEffect(() => {
    if (!currentTenant?.id) {
      setSimulation(null);
      return;
    }

    // Check if current tenant is a simulation tenant
    const checkSimulation = async () => {
      try {
        const { data, error } = await supabase
          .from('simulation_active')
          .select('id, name, ends_at, status')
          .eq('tenant_id', currentTenant.id)
          .eq('status', 'running')
          .maybeSingle();

        if (error) {
          console.error('Error querying simulation:', error);
          setSimulation(null);
          return;
        }

        if (!data) {
          console.log('No active simulation found for this tenant');
          setSimulation(null);
          return;
        }

        setSimulation(data);
      } catch (err) {
        console.error('Error checking simulation:', err);
        setSimulation(null);
      }
    };

    checkSimulation();

    // Re-check every 30 seconds
    const interval = setInterval(checkSimulation, 30000);
    return () => clearInterval(interval);
  }, [currentTenant?.id]);

  useEffect(() => {
    if (!simulation?.ends_at) {
      setTimeRemaining('');
      return;
    }

    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const endTime = new Date(simulation.ends_at).getTime();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeRemaining('Ended');
        setIsExpiringSoon(false);
        
        // Start grace period for simulation_only users (15 minutes)
        if (profile?.simulation_only && gracePeriodEnd === null) {
          const graceEnd = now + (15 * 60 * 1000); // 15 minutes from now
          setGracePeriodEnd(graceEnd);
        }
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      // Mark as expiring soon if less than 10 minutes
      setIsExpiringSoon(diff < 10 * 60 * 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [simulation?.ends_at, profile?.simulation_only, gracePeriodEnd]);

  // Grace period countdown and auto-kick
  useEffect(() => {
    if (!gracePeriodEnd || !profile?.simulation_only) {
      setGraceTimeRemaining('');
      return;
    }

    const updateGraceTimer = () => {
      const now = new Date().getTime();
      const diff = gracePeriodEnd - now;

      if (diff <= 0) {
        // Grace period expired - kick back to lobby
        setGraceTimeRemaining('Redirecting...');
        setIsExiting(true);
        // Exit simulation and redirect to lobby
        exitSimulationTenant().then(() => {
          navigate('/app/simulation-portal');
        }).catch((error) => {
          console.error('Error exiting simulation during auto-kick:', error);
          // Force navigation even if exit fails
          navigate('/app/simulation-portal');
        });
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setGraceTimeRemaining(`${minutes}m ${seconds}s`);
    };

    updateGraceTimer();
    const interval = setInterval(updateGraceTimer, 1000);
    return () => clearInterval(interval);
  }, [gracePeriodEnd, profile?.simulation_only, exitSimulationTenant, navigate]);

  if (!simulation) {
    return null;
  }

  return (
    <div className="mx-4 mb-4">
      <div className={`rounded-lg p-4 border-2 ${
        isExpiringSoon 
          ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700' 
          : 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700'
      }`}>
        {/* Header with pulsing indicator */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Monitor className={`h-5 w-5 ${
                isExpiringSoon ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
              }`} />
              <span className={`absolute -top-1 -right-1 h-3 w-3 rounded-full ${
                isExpiringSoon ? 'bg-red-500' : 'bg-blue-500'
              } animate-pulse`}></span>
            </div>
            <span className={`text-xs font-semibold uppercase tracking-wide ${
              isExpiringSoon ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'
            }`}>
              Simulation
            </span>
          </div>
          {isExpiringSoon && (
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 animate-pulse" />
          )}
        </div>

        {/* Simulation Name */}
        <div className="mb-2">
          <p className={`font-semibold text-sm ${
            isExpiringSoon ? 'text-red-900 dark:text-red-200' : 'text-blue-900 dark:text-blue-200'
          }`}>
            {simulation.name}
          </p>
        </div>

        {/* Time Remaining */}
        <div className="flex items-center space-x-2">
          <Clock className={`h-4 w-4 ${
            isExpiringSoon ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
          }`} />
          <div className="flex-1">
            <div className="flex items-baseline space-x-1">
              <span className={`text-xs font-medium ${
                isExpiringSoon ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'
              }`}>
                {timeRemaining === 'Ended' ? 'Simulation Ended' : 'Time Remaining:'}
              </span>
              {timeRemaining !== 'Ended' && (
                <span className={`text-lg font-bold tabular-nums ${
                  isExpiringSoon ? 'text-red-900 dark:text-red-200' : 'text-blue-900 dark:text-blue-200'
                }`}>
                  {timeRemaining}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expiring Soon Warning */}
        {isExpiringSoon && timeRemaining !== 'Ended' && (
          <div className="mt-2 pt-2 border-t border-red-300 dark:border-red-700">
            <p className="text-xs text-red-700 dark:text-red-300 font-medium">
              ⚠️ Simulation ending soon!
            </p>
          </div>
        )}

        {/* Grace Period Warning - Only for simulation_only users */}
        {timeRemaining === 'Ended' && gracePeriodEnd && graceTimeRemaining && profile?.simulation_only && (
          <div className="mt-2 pt-2 border-t border-orange-300 dark:border-orange-700">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 animate-pulse flex-shrink-0" />
              <div>
                <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                  ⚠️ Simulation ended - Returning to lobby in:
                </p>
                <p className="text-sm font-bold text-orange-900 dark:text-orange-200 mt-0.5 tabular-nums">
                  {graceTimeRemaining}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Exit Simulation Button */}
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleExitSimulation}
            disabled={isExiting}
            className={`w-full flex items-center justify-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              isExiting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            <LogOut className="h-3 w-3" />
            <span>{isExiting ? 'Exiting...' : 'Exit Simulation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulationIndicator;
