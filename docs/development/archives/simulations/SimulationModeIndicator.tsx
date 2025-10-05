import React from 'react';
import { Monitor, X, Users, Clock } from 'lucide-react';
import { useSimulation } from '../../contexts/SimulationContext';

const SimulationModeIndicator: React.FC = () => {
  const { isSimulationMode, currentSimulation, exitSimulationMode } = useSimulation();

  if (!isSimulationMode || !currentSimulation) {
    return null;
  }

  return (
    <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Monitor className="w-5 h-5 text-orange-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-orange-800">
              🎯 Simulation Mode Active
            </h3>
            <p className="text-sm text-orange-700">
              <strong>{currentSimulation.session_name}</strong> • {currentSimulation.scenario_template?.name}
            </p>
            <div className="flex items-center gap-4 mt-1 text-xs text-orange-600">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {currentSimulation.student_ids.length} students
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Started {new Date(currentSimulation.start_time).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={exitSimulationMode}
          className="text-orange-600 hover:text-orange-800 p-1"
          title="Exit simulation mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SimulationModeIndicator;