/**
 * Simulation Router - Routes users based on subdomain and authentication
 * 
 * Handles routing for simulation.haccare.app subdomain:
 * - Unauthenticated users → Login page with simulation context
 * - Authenticated users → Simulation Portal (with auto-routing logic)
 */

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import SimulationPortal from './SimulationPortal';
import SimulationLogin from '../Auth/SimulationLogin';
import LoadingSpinner from '../UI/LoadingSpinner';

/**
 * Check if current domain is simulation subdomain
 */
const isSimulationSubdomain = (): boolean => {
  const hostname = window.location.hostname;
  
  // In development, check for ?simulation param or /simulation-portal path
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search);
    return params.has('simulation') || window.location.pathname.startsWith('/simulation-portal');
  }
  
  // In production, check for simulation.haccare.app
  return hostname.startsWith('simulation.');
};

const SimulationRouter: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If we're on the simulation subdomain and logged in, ensure we're on portal
    if (!loading && user && isSimulationSubdomain()) {
      if (location.pathname === '/login' || location.pathname === '/' || location.pathname === '/app') {
        navigate('simulation-portal', { replace: true });
      }
    }
  }, [user, loading, location, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <SimulationLogin />;
  }

  // Show portal for authenticated users
  return <SimulationPortal />;
};

export default SimulationRouter;
