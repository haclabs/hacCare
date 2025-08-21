/**
 * Wound Care Dashboard Component
 * 
 * Displays a comprehensive overview of wound assessments and treatments.
 * Provides visual tracking of wound healing progress and treatment history.
 * 
 * Features:
 * - Assessment timeline
 * - Wound measurement trends
 * - Treatment history
 * - Photo gallery
 * - Quick actions
 */

import React, { useState } from 'react';
import { Calendar, TrendingUp, Camera, Edit3, Plus, Ruler, AlertTriangle, Clock } from 'lucide-react';
import { WoundAssessment, WoundTreatment, Patient } from '../../types';

interface WoundCareDashboardProps {
  patient: Patient;
  assessments: WoundAssessment[];
  treatments: WoundTreatment[];
  onEditAssessment: (assessment: WoundAssessment) => void;
  onAddTreatment: (treatment: Omit<WoundTreatment, 'id' | 'created_at' | 'updated_at'>) => void;
}

export const WoundCareDashboard: React.FC<WoundCareDashboardProps> = ({
  patient,
  assessments,
  treatments,
  onEditAssessment,
  onAddTreatment
}) => {
  const [selectedAssessment, setSelectedAssessment] = useState<WoundAssessment | null>(null);

  // Calculate wound area for each assessment
  const getWoundArea = (assessment: WoundAssessment) => {
    return (assessment.length_cm * assessment.width_cm).toFixed(2);
  };

  // Get the latest assessment
  const latestAssessment = assessments[0];

  // Calculate healing progress
  const getHealingTrend = () => {
    if (assessments.length < 2) return null;
    
    const latest = assessments[0];
    const previous = assessments[1];
    
    const latestArea = parseFloat(getWoundArea(latest));
    const previousArea = parseFloat(getWoundArea(previous));
    
    const change = previousArea - latestArea;
    const percentChange = ((change / previousArea) * 100).toFixed(1);
    
    return {
      change,
      percentChange: parseFloat(percentChange),
      improving: change > 0
    };
  };

  const healingTrend = getHealingTrend();

  // Get wound locations (unique)
  const woundLocations = [...new Set(assessments.map(a => a.wound_location))];

  // Get recent treatments (last 7 days)
  const recentTreatments = treatments.filter(t => {
    const treatmentDate = new Date(t.treatment_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return treatmentDate >= weekAgo;
  });

  return (
    <div className="p-6">
      {assessments.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Wound Assessments
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Start by creating the first wound assessment for {patient.first_name} {patient.last_name}
          </p>
          <button
            onClick={() => {/* This would be handled by parent component */}}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2 mx-auto"
          >
            <Plus className="h-5 w-5" />
            <span>Create First Assessment</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Latest Assessment Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300">
                  Latest Assessment
                </h3>
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {new Date(latestAssessment.assessment_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  <strong>Location:</strong> {latestAssessment.wound_location}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  <strong>Size:</strong> {latestAssessment.length_cm} × {latestAssessment.width_cm} cm
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  <strong>Area:</strong> {getWoundArea(latestAssessment)} cm²
                </p>
              </div>
            </div>

            {/* Healing Progress Card */}
            <div className={`bg-gradient-to-br border rounded-lg p-6 ${
              healingTrend?.improving 
                ? 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800' 
                : healingTrend 
                  ? 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800'
                  : 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${
                  healingTrend?.improving 
                    ? 'text-green-900 dark:text-green-300' 
                    : healingTrend 
                      ? 'text-orange-900 dark:text-orange-300'
                      : 'text-gray-900 dark:text-gray-300'
                }`}>
                  Healing Progress
                </h3>
                <TrendingUp className={`h-6 w-6 ${
                  healingTrend?.improving 
                    ? 'text-green-600 dark:text-green-400' 
                    : healingTrend 
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              {healingTrend ? (
                <div className="space-y-2">
                  <p className={`text-lg font-bold ${
                    healingTrend.improving ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {healingTrend.improving ? '↓' : '↑'} {Math.abs(healingTrend.percentChange)}%
                  </p>
                  <p className={`text-sm ${
                    healingTrend.improving 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-orange-700 dark:text-orange-300'
                  }`}>
                    {healingTrend.improving ? 'Improving' : 'Needs attention'}
                  </p>
                  <p className={`text-xs ${
                    healingTrend.improving 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-orange-600 dark:text-orange-400'
                  }`}>
                    Size change: {healingTrend.change.toFixed(2)} cm²
                  </p>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  Need more assessments to show trend
                </p>
              )}
            </div>

            {/* Recent Treatments Card */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300">
                  Recent Treatments
                </h3>
                <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {recentTreatments.length}
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  In the last 7 days
                </p>
                {recentTreatments.length > 0 && (
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Last: {new Date(recentTreatments[0].treatment_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Assessment Timeline */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Assessment Timeline
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {assessments.length} assessments
              </span>
            </div>

            <div className="space-y-4">
              {assessments.slice(0, 5).map((assessment, index) => (
                <div
                  key={assessment.id}
                  className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-blue-500' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {assessment.wound_location}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(assessment.assessment_date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Size:</span> {assessment.length_cm} × {assessment.width_cm} cm
                      </div>
                      <div>
                        <span className="font-medium">Area:</span> {getWoundArea(assessment)} cm²
                      </div>
                      <div>
                        <span className="font-medium">Depth:</span> {assessment.depth_cm} cm
                      </div>
                      <div>
                        <span className="font-medium">Pain:</span> {assessment.pain_level}/10
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          assessment.wound_bed === 'red' ? 'bg-red-100 text-red-800' :
                          assessment.wound_bed === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          assessment.wound_bed === 'black' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {assessment.wound_bed} bed
                        </span>
                        
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          assessment.exudate_amount === 'none' ? 'bg-green-100 text-green-800' :
                          assessment.exudate_amount === 'minimal' ? 'bg-blue-100 text-blue-800' :
                          assessment.exudate_amount === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {assessment.exudate_amount} exudate
                        </span>
                        
                        {assessment.signs_of_infection && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Infection signs
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => onEditAssessment(assessment)}
                        className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {assessments.length > 5 && (
                <div className="text-center py-4">
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                    View all {assessments.length} assessments →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Wound Measurement Chart */}
          {assessments.length > 1 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Ruler className="h-5 w-5 mr-2" />
                  Size Trend
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Wound area over time (last 10 assessments)
                </div>
                
                {/* Simple chart representation */}
                <div className="space-y-2">
                  {assessments.slice(0, 10).reverse().map((assessment, index) => {
                    const area = parseFloat(getWoundArea(assessment));
                    const maxArea = Math.max(...assessments.map(a => parseFloat(getWoundArea(a))));
                    const width = (area / maxArea) * 100;
                    
                    return (
                      <div key={assessment.id} className="flex items-center space-x-4">
                        <div className="w-20 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(assessment.assessment_date).toLocaleDateString()}
                        </div>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative">
                          <div
                            className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                            style={{ width: `${width}%` }}
                          ></div>
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-700 dark:text-gray-300">
                            {area} cm²
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Recent Photos */}
          {latestAssessment?.photos && latestAssessment.photos.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Recent Photos
                </h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {latestAssessment.photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`Wound photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-75 transition-opacity"
                      onClick={() => setSelectedAssessment(latestAssessment)}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-25 rounded-lg transition-all duration-200 flex items-center justify-center">
                      <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
