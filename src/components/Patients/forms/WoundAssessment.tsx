import React, { useState, useEffect } from 'react';
import { Plus, Trash2, MapPin, Save, X, Image } from 'lucide-react';
import { format } from 'date-fns';
import { fetchPatientWounds, createWound, deleteWound, WoundUI } from '../../lib/woundService';
import { useAuth } from '../../hooks/useAuth';
import { ImageAnnotation } from './ImageAnnotation';

export interface WoundAssessmentProps {
  patientId: string;
  onClose?: () => void;
  onSave?: () => void;
}

export const WoundAssessment: React.FC<WoundAssessmentProps> = ({ patientId, onClose, onSave }) => {
  const [wounds, setWounds] = useState<WoundUI[]>([]);
  
  const [showImageAnnotation, setShowImageAnnotation] = useState(false);
  const [selectedView, setSelectedView] = useState<'anterior' | 'posterior'>('anterior');
  const [showAddWound, setShowAddWound] = useState(false);
  const [selectedWound, setSelectedWound] = useState<WoundUI | null>(null);
  const [newWoundCoords, setNewWoundCoords] = useState<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const [newWound, setNewWound] = useState<Partial<WoundUI>>({
    type: 'Pressure Ulcer',
    stage: 'Stage 1',
    size: { length: 0, width: 0 },
    description: '',
    treatment: '',
    healingProgress: 'New'
  });

  // Load wounds when component mounts
  useEffect(() => {
    if (patientId) {
      loadWounds();
    }
  }, [patientId]);

  // Load wounds from database
  const loadWounds = async () => {
    setLoading(true);
    setError(null);
    try {
      const woundData = await fetchPatientWounds(patientId);
      setWounds(woundData);
    } catch (error) {
      console.error('Error loading wounds:', error);
      setError('Failed to load wound assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleBodyClick = (event: React.MouseEvent<SVGElement>) => {
    if (!showAddWound) return;
    
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    setNewWoundCoords({ x, y });
  };

  const handleSaveWound = async () => {
    if (!newWoundCoords || !profile) return;
    
    const wound: WoundUI = {
      id: `wound-${Date.now()}`,
      location: newWound.location || 'Unspecified location',
      coordinates: {
        x: newWoundCoords.x,
        y: newWoundCoords.y
      },
      view: selectedView,
      type: newWound.type || 'Pressure Ulcer',
      stage: newWound.stage || 'Stage 1',
      size: {
        length: newWound.size?.length || 0,
        width: newWound.size?.width || 0,
        depth: newWound.size?.depth
      },
      description: newWound.description || '',
      treatment: newWound.treatment || '', 
      assessedBy: `${profile.first_name} ${profile.last_name}`,
      assessmentDate: new Date().toISOString(), 
      healingProgress: newWound.healingProgress || 'New'
    };
    
    try {
      setLoading(true);
      const savedWound = await createWound(wound, patientId);
      setWounds(prev => [...prev, savedWound]);
      setError(null);
    } catch (err) {
      console.error('Error saving wound:', err);
      setError('Failed to save wound assessment');
    } finally {
      setLoading(false);
    }
    setShowAddWound(false);
    setNewWoundCoords(null);
    setNewWound({
      location: '',
      type: 'Pressure Ulcer',
      stage: 'Stage 1',
      size: { length: 0, width: 0 },
      description: '',
      treatment: '',
      healingProgress: 'New'
    });
    
    // Call onSave callback if provided
    if (onSave) {
      onSave();
    }
  };

  const handleDeleteWound = async (woundId: string) => {
    if (window.confirm('Are you sure you want to delete this wound assessment?')) {
      try {
        setLoading(true);
        await deleteWound(woundId);
        setWounds(prev => prev.filter(w => w.id !== woundId));
        setError(null);
      } catch (err) {
        console.error('Error deleting wound:', err);
        setError('Failed to delete wound assessment');
      } finally {
        setLoading(false);
      }
    }
  };

  const getWoundColor = (wound: Wound) => {
    switch (wound.healingProgress) {
      case 'Improving': return '#10b981'; // green
      case 'Stable': return '#3b82f6'; // blue
      case 'Deteriorating': return '#ef4444'; // red
      case 'New': return '#f59e0b'; // amber
      default: return '#6b7280'; // gray
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Stage 1': return 'bg-yellow-100 text-yellow-800';
      case 'Stage 2': return 'bg-orange-100 text-orange-800';
      case 'Stage 3': return 'bg-red-100 text-red-800';
      case 'Stage 4': return 'bg-red-200 text-red-900';
      case 'Unstageable': return 'bg-purple-100 text-purple-800';
      case 'Deep Tissue Injury': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // SVG body diagrams
  const AnteriorBodySVG = () => (
    <svg
      viewBox="0 0 200 400"
      className="w-full h-full cursor-crosshair"
      onClick={handleBodyClick}
    >
      {/* Head */}
      <ellipse cx="100" cy="40" rx="25" ry="30" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Neck */}
      <rect x="90" y="65" width="20" height="15" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Torso */}
      <ellipse cx="100" cy="140" rx="45" ry="60" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Arms */}
      <ellipse cx="60" cy="120" rx="12" ry="40" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="140" cy="120" rx="12" ry="40" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Forearms */}
      <ellipse cx="50" cy="180" rx="10" ry="35" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="150" cy="180" rx="10" ry="35" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Hands */}
      <ellipse cx="45" cy="220" rx="8" ry="12" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="155" cy="220" rx="8" ry="12" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Pelvis */}
      <ellipse cx="100" cy="220" rx="35" ry="25" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Thighs */}
      <ellipse cx="85" cy="280" rx="15" ry="45" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="115" cy="280" rx="15" ry="45" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Lower legs */}
      <ellipse cx="85" cy="350" rx="12" ry="40" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="115" cy="350" rx="12" ry="40" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Feet */}
      <ellipse cx="85" cy="390" rx="8" ry="10" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="115" cy="390" rx="8" ry="10" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Render wounds for anterior view */}
      {wounds
        .filter(wound => wound.view === 'anterior')
        .map(wound => (
          <g key={wound.id}>
            <circle
              cx={wound.coordinates.x * 2}
              cy={wound.coordinates.y * 4}
              r="6"
              fill={getWoundColor(wound)}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedWound(wound);
              }}
            />
            <text
              x={wound.coordinates.x * 2}
              y={wound.coordinates.y * 4 + 2}
              textAnchor="middle"
              className="text-xs font-bold fill-white pointer-events-none"
            >
              {wounds.filter(w => w.view === 'anterior').indexOf(wound) + 1}
            </text>
          </g>
        ))}
      
      {/* Show new wound placement */}
      {showAddWound && newWoundCoords && selectedView === 'anterior' && (
        <circle
          cx={newWoundCoords.x * 2}
          cy={newWoundCoords.y * 4}
          r="6"
          fill="#f59e0b"
          stroke="white"
          strokeWidth="2"
          className="animate-pulse"
        />
      )}
    </svg>
  );

  const PosteriorBodySVG = () => (
    <svg
      viewBox="0 0 200 400"
      className="w-full h-full cursor-crosshair"
      onClick={handleBodyClick}
    >
      {/* Head (back) */}
      <ellipse cx="100" cy="40" rx="25" ry="30" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Neck */}
      <rect x="90" y="65" width="20" height="15" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Back/Torso */}
      <ellipse cx="100" cy="140" rx="45" ry="60" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Arms (back) */}
      <ellipse cx="60" cy="120" rx="12" ry="40" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="140" cy="120" rx="12" ry="40" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Forearms (back) */}
      <ellipse cx="50" cy="180" rx="10" ry="35" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="150" cy="180" rx="10" ry="35" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Hands (back) */}
      <ellipse cx="45" cy="220" rx="8" ry="12" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="155" cy="220" rx="8" ry="12" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Buttocks */}
      <ellipse cx="100" cy="220" rx="35" ry="25" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Thighs (back) */}
      <ellipse cx="85" cy="280" rx="15" ry="45" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="115" cy="280" rx="15" ry="45" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Calves */}
      <ellipse cx="85" cy="350" rx="12" ry="40" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="115" cy="350" rx="12" ry="40" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Heels */}
      <ellipse cx="85" cy="390" rx="8" ry="10" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="115" cy="390" rx="8" ry="10" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Render wounds for posterior view */}
      {wounds
        .filter(wound => wound.view === 'posterior')
        .map(wound => (
          <g key={wound.id}>
            <circle
              cx={wound.coordinates.x * 2}
              cy={wound.coordinates.y * 4}
              r="6"
              fill={getWoundColor(wound)}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedWound(wound);
              }}
            />
            <text
              x={wound.coordinates.x * 2}
              y={wound.coordinates.y * 4 + 2}
              textAnchor="middle"
              className="text-xs font-bold fill-white pointer-events-none"
            >
              {wounds.filter(w => w.view === 'posterior').indexOf(wound) + 1}
            </text>
          </g>
        ))}
      
      {/* Show new wound placement */}
      {showAddWound && newWoundCoords && selectedView === 'posterior' && (
        <circle
          cx={newWoundCoords.x * 2}
          cy={newWoundCoords.y * 4}
          r="6"
          fill="#f59e0b"
          stroke="white"
          strokeWidth="2"
          className="animate-pulse"
        />
      )}
    </svg>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Wound Assessment</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowImageAnnotation(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Image className="h-4 w-4" />
            <span>Wound Images</span>
          </button>
          <button
            onClick={() => setShowAddWound(!showAddWound)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              showAddWound 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {showAddWound ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{showAddWound ? 'Cancel' : 'Add Wound'}</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      {showAddWound && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <p className="text-blue-800 font-medium">Adding New Wound</p>
          </div>
          <p className="text-blue-700 text-sm">
            1. Select the body view (Anterior/Posterior)
            2. Click on the body diagram where the wound is located
            3. Fill in the wound details below
            4. Click "Save Wound" to add to assessment
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Body Diagram */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4"> 
            <h4 className="text-lg font-medium text-gray-900">Body Diagram</h4>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSelectedView('anterior')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedView === 'anterior'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Anterior
              </button>
              <button
                onClick={() => setSelectedView('posterior')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedView === 'posterior'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Posterior
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 h-96 flex items-center justify-center"> 
            {selectedView === 'anterior' ? <AnteriorBodySVG /> : <PosteriorBodySVG />}
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Improving</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Stable</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Deteriorating</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span>New</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wound Details Form (when adding) */}
        {showAddWound && newWoundCoords && (
          <div className="bg-white border border-gray-200 rounded-lg p-6"> 
            <h4 className="text-lg font-medium text-gray-900 mb-4">Wound Details</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Description
                </label>
                <input
                  type="text" 
                  value={newWound.location || ''}
                  onChange={(e) => setNewWound(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Left heel, Right shoulder blade"
                />
              </div>

              <div className="grid grid-cols-2 gap-4"> 
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wound Type
                  </label>
                  <select
                    value={newWound.type || 'Pressure Ulcer'}
                    onChange={(e) => setNewWound(prev => ({ ...prev, type: e.target.value as Wound['type'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  >
                    <option value="Pressure Ulcer">Pressure Ulcer</option>
                    <option value="Surgical">Surgical</option>
                    <option value="Traumatic">Traumatic</option>
                    <option value="Diabetic">Diabetic</option>
                    <option value="Venous">Venous</option>
                    <option value="Arterial">Arterial</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stage/Grade
                  </label>
                  <select
                    value={newWound.stage || 'Stage 1'}
                    onChange={(e) => setNewWound(prev => ({ ...prev, stage: e.target.value as Wound['stage'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  >
                    <option value="Stage 1">Stage 1</option>
                    <option value="Stage 2">Stage 2</option>
                    <option value="Stage 3">Stage 3</option>
                    <option value="Stage 4">Stage 4</option>
                    <option value="Unstageable">Unstageable</option>
                    <option value="Deep Tissue Injury">Deep Tissue Injury</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4"> 
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Length (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newWound.size?.length || 0}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setNewWound(prev => ({
                        ...prev,
                        size: { ...(prev.size || { width: 0 }), length: value }
                      })); 
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newWound.size?.width || 0}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setNewWound(prev => ({
                        ...prev,
                        size: { ...(prev.size || { length: 0 }), width: value }
                      })); 
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Depth (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newWound.size?.depth || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      setNewWound(prev => ({
                        ...prev,
                        size: { ...(prev.size || { length: 0, width: 0 }), depth: value }
                      })); 
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <div className="space-y-2">
                  <textarea
                    value={newWound.description || ''}
                    onChange={(e) => setNewWound(prev => ({ ...prev, description: e.target.value }))} 
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe wound appearance, drainage, surrounding tissue..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowImageAnnotation(true)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Image className="h-4 w-4" />
                    <span>Add Wound Images</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Treatment Plan
                </label>
                <textarea
                  value={newWound.treatment || ''}
                  onChange={(e) => setNewWound(prev => ({ ...prev, treatment: e.target.value }))} 
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Dressing type, frequency, special instructions..."
                />
              </div>

              <button
                onClick={handleSaveWound}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                disabled={!newWoundCoords}
              > 
                <Save className="h-4 w-4" />
                <span>Save Wound Assessment</span>
              </button>
            </div>
          </div>
        )}

        {/* Wound List (when not adding) */}
        {!showAddWound && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 min-h-[300px]"> 
            <h4 className="text-lg font-medium text-gray-900 mb-4">Current Wounds</h4>
            
            {wounds.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No wounds documented</p>
                <p className="text-sm text-gray-400">Click "Add Wound" to begin assessment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {wounds.map((wound, index) => (
                  <div key={wound.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" 
                          style={{ backgroundColor: getWoundColor(wound) }}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">{wound.location}</h5>
                          <p className="text-sm text-gray-600">{wound.view} view</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(wound.stage)}`}> 
                          {wound.stage}
                        </span>
                        <button
                          onClick={() => handleDeleteWound(wound.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div> 
                        <p className="text-gray-600">Type: <span className="font-medium">{wound.type}</span></p>
                        <p className="text-gray-600">Size: <span className="font-medium">{wound.size.length} × {wound.size.width} cm</span></p>
                      </div>
                      <div>
                        <p className="text-gray-600">Progress: <span className="font-medium">{wound.healingProgress}</span></p>
                        <p className="text-gray-600">Assessed: <span className="font-medium">{format(new Date(wound.assessmentDate), 'MM/dd HH:mm')}</span></p>
                      </div>
                    </div>
                    
                    {wound.description && ( 
                      <p className="text-sm text-gray-700 mb-2">{wound.description}</p>
                    )}
                    
                    {wound.treatment && ( 
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-xs text-blue-800"><strong>Treatment:</strong> {wound.treatment}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Image Annotation Modal */}
      {showImageAnnotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Wound Images</h2>
              <button
                onClick={() => setShowImageAnnotation(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <ImageAnnotation 
                patientId={patientId} 
                patientName="Wound Documentation"
                onClose={() => setShowImageAnnotation(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Selected Wound Details Modal */}
      {selectedWound && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"> 
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Wound Details</h3>
              <button
                onClick={() => setSelectedWound(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4"> 
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Location & Classification</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Location:</strong> {selectedWound.location}</p>
                    <p><strong>View:</strong> {selectedWound.view}</p>
                    <p><strong>Type:</strong> {selectedWound.type}</p>
                    <p><strong>Stage:</strong> <span className={`px-2 py-1 rounded-full text-xs ${getStageColor(selectedWound.stage)}`}>{selectedWound.stage}</span></p>
                  </div>
                </div>
                 
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Measurements</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Length:</strong> {selectedWound.size.length} cm</p>
                    <p><strong>Width:</strong> {selectedWound.size.width} cm</p>
                    {selectedWound.size.depth && <p><strong>Depth:</strong> {selectedWound.size.depth} cm</p>}
                    <p><strong>Progress:</strong> <span className="font-medium" style={{ color: getWoundColor(selectedWound) }}>{selectedWound.healingProgress}</span></p>
                  </div>
                </div>
              </div>
               
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Assessment</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedWound.description}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Treatment Plan</h4>
                <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded">{selectedWound.treatment}</p>
              </div>
               
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <p><strong>Assessed by:</strong> {selectedWound.assessedBy}</p>
                  <p><strong>Date:</strong> {format(new Date(selectedWound.assessmentDate), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                <button
                  onClick={() => setSelectedWound(null)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};