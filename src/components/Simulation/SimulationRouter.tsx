import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SimulationLobby from './SimulationLobby';
import { useSimulationAwareAuth } from '../../contexts/auth/SimulationAwareAuthProvider';
import { useAuth } from '../../contexts/auth/SimulationAwareAuthProvider';

interface SimulationRouterProps {
  children?: React.ReactNode;
}

export const SimulationRouter: React.FC<SimulationRouterProps> = ({ children }) => {
  const { isSimulationUser, simulationId } = useSimulationAwareAuth();
  const { user } = useAuth();

  // If this is a simulation user, provide simulation-specific routing
  if (isSimulationUser && simulationId && user) {
    return (
      <Routes>
        {/* Simulation lobby route */}
        <Route 
          path="/simulation/lobby" 
          element={
            <SimulationLobby 
              simulationId={simulationId}
              currentUserId={user.id}
              onSimulationStart={() => {
                // Redirect to simulation when started
                window.location.href = '/simulation/active';
              }}
            />
          } 
        />
        
        {/* Active simulation route - redirects to main app for now */}
        <Route 
          path="/simulation/active" 
          element={children || <div>Simulation Active</div>}
        />
        
        {/* Default route for simulation users goes to lobby */}
        <Route path="*" element={<Navigate to="/simulation/lobby" replace />} />
      </Routes>
    );
  }

  // For regular users, render children (main app routes)
  return <>{children}</>;
};

export default SimulationRouter;