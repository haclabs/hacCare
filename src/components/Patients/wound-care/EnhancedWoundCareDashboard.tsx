/**
 * Enhanced Wound Care Dashboard
 * 
 * Provides a comprehensive overview of wound assessments with:
 * - Body diagrams showing wound locations (front and back views)
 * - Latest assessment details prominently displayed
 * - Timeline of last 5 assessments
 * - Quick access to wound details and treatment plans
 */

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Ruler, 
  MapPin, 
  Camera,
  Plus,
  Eye,
  FileText
} from 'lucide-react';
import { BodyDiagram } from '../diagrams/BodyDiagram';
import { WoundUI, fetchPatientWounds } from '../../../lib/woundService';
import { format } from 'date-fns';

interface EnhancedWoundCareDashboardProps {
  patientId: string;
  patientName: string;
  onAddWound?: () => void;
  onViewWound?: (wound: WoundUI) => void;
}

export const EnhancedWoundCareDashboard: React.FC<EnhancedWoundCareDashboardProps> = ({
  patientId,
  patientName,
  onAddWound,
  onViewWound
}) => {
  const [wounds, setWounds] = useState<WoundUI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWounds();
  }, [patientId]);

  const loadWounds = async () => {
    try {
      setLoading(true);
      const woundData = await fetchPatientWounds(patientId);
      setWounds(woundData);
    } catch (error) {
      console.error('Error loading wounds:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get the latest assessment (most recent wound)
  const latestWound = wounds.length > 0 
    ? wounds.sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0]
    : null;

  // Get last 5 assessments for timeline
  const recentAssessments = wounds
    .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())
    .slice(0, 5);

  const getWoundStatusColor = (progress: string) => {
    switch (progress) {
      case 'Improving': return 'text-green-600 bg-green-100';
      case 'Stable': return 'text-blue-600 bg-blue-100';
      case 'Deteriorating': return 'text-red-600 bg-red-100';
      case 'New': return 'text-amber-600 bg-amber-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getWoundArea = (wound: WoundUI) => {
    return (wound.size.length * wound.size.width).toFixed(2);
  };

  const handleWoundClick = (wound: WoundUI) => {
    if (onViewWound) onViewWound(wound);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Wound Care Management</h2>
          <p className="text-gray-600">Patient: {patientName}</p>
        </div>
        {onAddWound && (
          <button
            onClick={onAddWound}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Wound Assessment</span>
          </button>
        )}
      </div>

      {wounds.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Wound Assessments</h3>
          <p className="text-gray-600 mb-6">
            Start by creating the first wound assessment for {patientName}
          </p>
          {onAddWound && (
            <button
              onClick={onAddWound}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <Plus className="h-5 w-5" />
              <span>Create First Assessment</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Body Diagrams */}
          <div className="xl:col-span-2 space-y-6">
            {/* Diagrams */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Body Diagram - Wound Locations</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Anterior View */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 text-center">Anterior (Front)</h4>
                  <div className="h-80 border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <BodyDiagram
                      view="anterior"
                      wounds={wounds}
                      onWoundClick={handleWoundClick}
                      showWoundNumbers={true}
                    />
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    {wounds.filter(w => w.view === 'anterior').length} wound(s) on front
                  </div>
                </div>

                {/* Posterior View */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 text-center">Posterior (Back)</h4>
                  <div className="h-80 border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <BodyDiagram
                      view="posterior"
                      wounds={wounds}
                      onWoundClick={handleWoundClick}
                      showWoundNumbers={true}
                    />
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    {wounds.filter(w => w.view === 'posterior').length} wound(s) on back
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Wound Status Legend</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Improving</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Stable</span>
                  </div>
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

            {/* Assessment Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Assessments (Last 5)</h3>
              
              {recentAssessments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No assessments available</p>
              ) : (
                <div className="space-y-4">
                  {recentAssessments.map((wound, index) => (
                    <div 
                      key={wound.id} 
                      className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleWoundClick(wound)}
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{wound.location}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWoundStatusColor(wound.healingProgress)}`}>
                            {wound.healingProgress}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>{wound.view} view</span>
                          <span>{wound.size.length} × {wound.size.width} cm</span>
                          <span>{format(new Date(wound.assessmentDate), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Latest Assessment Details */}
          <div className="space-y-6">
            {latestWound && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Latest Assessment</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getWoundStatusColor(latestWound.healingProgress)}`}>
                    {latestWound.healingProgress}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Location */}
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{latestWound.location}</p>
                      <p className="text-xs text-gray-500">{latestWound.view} view</p>
                    </div>
                  </div>

                  {/* Measurements */}
                  <div className="flex items-start space-x-3">
                    <Ruler className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Dimensions</p>
                      <p className="text-xs text-gray-600">
                        {latestWound.size.length} × {latestWound.size.width} cm
                        {latestWound.size.depth && ` × ${latestWound.size.depth} cm (depth)`}
                      </p>
                      <p className="text-xs text-gray-500">Area: {getWoundArea(latestWound)} cm²</p>
                    </div>
                  </div>

                  {/* Assessment Date */}
                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Assessed</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(latestWound.assessmentDate), 'MMM d, yyyy h:mm a')}
                      </p>
                      <p className="text-xs text-gray-500">by {latestWound.assessedBy}</p>
                    </div>
                  </div>

                  {/* Type & Stage */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Type</p>
                      <p className="text-sm text-gray-900">{latestWound.type}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Stage</p>
                      <p className="text-sm text-gray-900">{latestWound.stage}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {latestWound.description && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-1">Assessment Notes</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {latestWound.description}
                      </p>
                    </div>
                  )}

                  {/* Treatment */}
                  {latestWound.treatment && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-1">Treatment Plan</p>
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                        {latestWound.treatment}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    <button
                      onClick={() => handleWoundClick(latestWound)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Full Details</span>
                    </button>
                    
                    {onAddWound && (
                      <button
                        onClick={onAddWound}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        <span>New Assessment</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Wound Statistics</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Wounds</span>
                  <span className="text-lg font-semibold text-gray-900">{wounds.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Improving</span>
                  <span className="text-lg font-semibold text-green-600">
                    {wounds.filter(w => w.healingProgress === 'Improving').length}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stable</span>
                  <span className="text-lg font-semibold text-blue-600">
                    {wounds.filter(w => w.healingProgress === 'Stable').length}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Deteriorating</span>
                  <span className="text-lg font-semibold text-red-600">
                    {wounds.filter(w => w.healingProgress === 'Deteriorating').length}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">New</span>
                  <span className="text-lg font-semibold text-amber-600">
                    {wounds.filter(w => w.healingProgress === 'New').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
