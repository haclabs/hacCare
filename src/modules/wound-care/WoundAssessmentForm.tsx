/**
 * Wound Assessment Form Component
 * 
 * A comprehensive form for creating and editing wound assessments.
 * Provides structured data entry for wound characteristics, measurements,
 * and clinical observations.
 * 
 * Features:
 * - Structured wound assessment fields
 * - Real-time validation
 * - Photo upload capabilities
 * - Pre-filled data for editing
 * - Professional medical terminology
 */

import React, { useState, useEffect } from 'react';
import { Camera, Save, X, Upload, Trash2, Ruler, MapPin } from 'lucide-react';
import { WoundAssessment, Patient } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface WoundAssessmentFormProps {
  patient: Patient;
  assessment?: WoundAssessment;
  onSave: (assessment: Omit<WoundAssessment, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

export const WoundAssessmentForm: React.FC<WoundAssessmentFormProps> = ({
  patient,
  assessment,
  onSave,
  onCancel
}) => {
  const { user } = useAuth();
  
  // Body diagram state
  const [selectedView, setSelectedView] = useState<'anterior' | 'posterior'>('anterior');
  const [showBodyDiagram, setShowBodyDiagram] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ x: number; y: number } | null>(null);
  
  const [formData, setFormData] = useState({
    patient_id: patient.id,
    assessment_date: new Date().toISOString().split('T')[0],
    wound_location: '',
    wound_type: 'pressure' as 'pressure' | 'surgical' | 'venous' | 'arterial' | 'diabetic' | 'traumatic' | 'other',
    stage: '',
    length_cm: 0,
    width_cm: 0,
    depth_cm: 0,
    wound_bed: 'red' as 'red' | 'yellow' | 'black' | 'mixed',
    exudate_amount: 'minimal' as 'none' | 'minimal' | 'moderate' | 'heavy',
    exudate_type: 'serous' as 'serous' | 'sanguineous' | 'serosanguineous' | 'purulent' | 'other',
    periwound_condition: '',
    pain_level: 0,
    odor: false,
    signs_of_infection: false,
    assessment_notes: '',
    photos: [] as string[],
    assessor_id: user?.id || '',
    assessor_name: user?.email || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  // Pre-fill form if editing existing assessment
  useEffect(() => {
    if (assessment) {
      setFormData({
        patient_id: assessment.patient_id,
        assessment_date: assessment.assessment_date.split('T')[0],
        wound_location: assessment.wound_location,
        wound_type: assessment.wound_type,
        stage: assessment.stage || '',
        length_cm: assessment.length_cm,
        width_cm: assessment.width_cm,
        depth_cm: assessment.depth_cm,
        wound_bed: assessment.wound_bed,
        exudate_amount: assessment.exudate_amount,
        exudate_type: assessment.exudate_type,
        periwound_condition: assessment.periwound_condition,
        pain_level: assessment.pain_level,
        odor: assessment.odor,
        signs_of_infection: assessment.signs_of_infection,
        assessment_notes: assessment.assessment_notes,
        photos: assessment.photos || [],
        assessor_id: assessment.assessor_id,
        assessor_name: assessment.assessor_name
      });
    }
  }, [assessment]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.wound_location.trim()) {
      newErrors.wound_location = 'Wound location is required';
    }
    if (!formData.assessment_date) {
      newErrors.assessment_date = 'Assessment date is required';
    }
    if (formData.length_cm < 0) {
      newErrors.length_cm = 'Length cannot be negative';
    }
    if (formData.width_cm < 0) {
      newErrors.width_cm = 'Width cannot be negative';
    }
    if (formData.depth_cm < 0) {
      newErrors.depth_cm = 'Depth cannot be negative';
    }
    if (formData.pain_level < 0 || formData.pain_level > 10) {
      newErrors.pain_level = 'Pain level must be between 0 and 10';
    }
    if (!formData.periwound_condition.trim()) {
      newErrors.periwound_condition = 'Periwound condition description is required';
    }
    if (!formData.assessment_notes.trim()) {
      newErrors.assessment_notes = 'Assessment notes are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Body diagram functionality
  const handleBodyClick = (event: React.MouseEvent<SVGElement>) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    setClickedCoords({ x, y });
    // Auto-populate wound location based on click coordinates
    const locationText = getLocationFromCoordinates(x, y, selectedView);
    handleInputChange('wound_location', locationText);
  };

  const getLocationFromCoordinates = (x: number, y: number, view: 'anterior' | 'posterior'): string => {
    // Coordinate mapping based on SVG viewBox="0 0 200 400" and actual body part positions
    // Convert percentage coordinates back to SVG coordinates for accurate mapping
    const svgX = (x / 100) * 200;
    const svgY = (y / 100) * 400;
    

    
    // Head area (y: 10-70)
    if (svgY < 70) return view === 'anterior' ? 'Face/Head' : 'Back of Head';
    
    // Neck area (y: 65-80)
    if (svgY < 80) return 'Neck';
    
    // Upper torso/chest area (y: 80-180)
    if (svgY < 180) {
      // Left arm area
      if (svgX < 75 && svgX > 40) return view === 'anterior' ? 'Left Arm/Shoulder' : 'Left Shoulder Blade';
      // Right arm area  
      if (svgX > 125 && svgX < 160) return view === 'anterior' ? 'Right Arm/Shoulder' : 'Right Shoulder Blade';
      // Center torso
      return view === 'anterior' ? 'Chest' : 'Upper Back';
    }
    
    // Lower torso/abdomen area (y: 180-245)
    if (svgY < 245) {
      // Left forearm/side
      if (svgX < 70) return view === 'anterior' ? 'Left Arm/Elbow' : 'Left Side';
      // Right forearm/side
      if (svgX > 130) return view === 'anterior' ? 'Right Arm/Elbow' : 'Right Side';  
      // Center abdomen
      return view === 'anterior' ? 'Abdomen' : 'Lower Back';
    }
    
    // Pelvis/hip area (y: 245-325)
    if (svgY < 325) {
      if (svgX < 85) return 'Left Hip/Thigh';
      if (svgX > 115) return 'Right Hip/Thigh';
      return view === 'anterior' ? 'Pelvis' : 'Sacrum/Coccyx';
    }
    
    // Lower leg area (y: 325-385)
    if (svgY < 385) {
      if (svgX < 100) return 'Left Knee/Lower Leg';
      if (svgX > 100) return 'Right Knee/Lower Leg';
      return 'Lower Leg';
    }
    
    // Feet area (y: 385+)
    if (svgX < 100) return 'Left Foot/Ankle';
    if (svgX > 100) return 'Right Foot/Ankle';
    return 'Feet';
  };

  // SVG Body Diagrams
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
      
      {/* Click indicator */}
      {clickedCoords && selectedView === 'anterior' && (
        <circle 
          cx={clickedCoords.x * 2} 
          cy={clickedCoords.y * 4} 
          r="5" 
          fill="red" 
          stroke="darkred" 
          strokeWidth="2"
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
      
      {/* Lower back/Pelvis */}
      <ellipse cx="100" cy="220" rx="35" ry="25" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Thighs (back) */}
      <ellipse cx="85" cy="280" rx="15" ry="45" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="115" cy="280" rx="15" ry="45" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Lower legs (back) */}
      <ellipse cx="85" cy="350" rx="12" ry="40" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="115" cy="350" rx="12" ry="40" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Feet (back) */}
      <ellipse cx="85" cy="390" rx="8" ry="10" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      <ellipse cx="115" cy="390" rx="8" ry="10" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2"/>
      
      {/* Click indicator */}
      {clickedCoords && selectedView === 'posterior' && (
        <circle 
          cx={clickedCoords.x * 2} 
          cy={clickedCoords.y * 4} 
          r="5" 
          fill="red" 
          stroke="darkred" 
          strokeWidth="2"
        />
      )}
    </svg>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave({
        ...formData,
        assessment_date: new Date(formData.assessment_date).toISOString()
      });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // In a real implementation, this would upload to Supabase Storage
      // For now, we'll create a mock URL
      const mockUrl = `https://example.com/wound-photos/${Date.now()}-${file.name}`;
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, mockUrl]
      }));
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {assessment ? 'Edit' : 'New'} Wound Assessment
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {patient.first_name} {patient.last_name} - {patient.patient_id}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assessment Date *
            </label>
            <input
              type="date"
              value={formData.assessment_date}
              onChange={(e) => handleInputChange('assessment_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.assessment_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.assessment_date && (
              <p className="text-red-500 text-sm mt-1">{errors.assessment_date}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Wound Location *
            </label>
            <input
              type="text"
              value={formData.wound_location}
              onChange={(e) => handleInputChange('wound_location', e.target.value)}
              placeholder="e.g., Left heel, Sacrum, Right elbow"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.wound_location ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.wound_location && (
              <p className="text-red-500 text-sm mt-1">{errors.wound_location}</p>
            )}
            
            {/* Interactive Body Diagram Button */}
            <button
              type="button"
              onClick={() => setShowBodyDiagram(!showBodyDiagram)}
              className="mt-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              📍 Use Body Diagram to Select Location
            </button>
          </div>
        </div>

        {/* Interactive Body Diagram Section */}
        {showBodyDiagram && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="mb-4">
              <h4 className="text-lg font-medium text-gray-900 mb-2">Select Wound Location</h4>
              <p className="text-sm text-gray-600 mb-4">
                Choose the body view and click on the diagram to automatically set the wound location.
              </p>
              
              {/* View Selector */}
              <div className="flex space-x-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedView('anterior')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedView === 'anterior'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Front View
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedView('posterior')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedView === 'posterior'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Back View
                </button>
              </div>
            </div>

            {/* Body Diagram */}
            <div className="bg-white rounded-lg p-4 flex justify-center">
              <div className="w-64 h-96">
                {selectedView === 'anterior' ? <AnteriorBodySVG /> : <PosteriorBodySVG />}
              </div>
            </div>
            
            {clickedCoords && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">
                  ✅ Location selected! The wound location field has been updated.
                  You can continue filling out the rest of the form.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Wound Type and Stage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Wound Type
            </label>
            <select
              value={formData.wound_type}
              onChange={(e) => handleInputChange('wound_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="surgical">Surgical</option>
              <option value="pressure">Pressure</option>
              <option value="venous">Venous</option>
              <option value="arterial">Arterial</option>
              <option value="diabetic">Diabetic</option>
              <option value="traumatic">Traumatic</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stage (if applicable)
            </label>
            <input
              type="text"
              value={formData.stage}
              onChange={(e) => handleInputChange('stage', e.target.value)}
              placeholder="e.g., Stage 2, Stage 3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Measurements */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <Ruler className="h-5 w-5 mr-2" />
            Wound Measurements (cm)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Length
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.length_cm}
                onChange={(e) => handleInputChange('length_cm', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.length_cm ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.length_cm && (
                <p className="text-red-500 text-sm mt-1">{errors.length_cm}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Width
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.width_cm}
                onChange={(e) => handleInputChange('width_cm', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.width_cm ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.width_cm && (
                <p className="text-red-500 text-sm mt-1">{errors.width_cm}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Depth
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.depth_cm}
                onChange={(e) => handleInputChange('depth_cm', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.depth_cm ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.depth_cm && (
                <p className="text-red-500 text-sm mt-1">{errors.depth_cm}</p>
              )}
            </div>
          </div>
        </div>

        {/* Wound Characteristics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Wound Bed
            </label>
            <select
              value={formData.wound_bed}
              onChange={(e) => handleInputChange('wound_bed', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="red">Red (healthy granulation)</option>
              <option value="yellow">Yellow (slough)</option>
              <option value="black">Black (necrotic)</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exudate Amount
            </label>
            <select
              value={formData.exudate_amount}
              onChange={(e) => handleInputChange('exudate_amount', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="none">None</option>
              <option value="minimal">Minimal</option>
              <option value="moderate">Moderate</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exudate Type
            </label>
            <select
              value={formData.exudate_type}
              onChange={(e) => handleInputChange('exudate_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="serous">Serous (clear)</option>
              <option value="sanguineous">Sanguineous (bloody)</option>
              <option value="serosanguineous">Serosanguineous (pink)</option>
              <option value="purulent">Purulent (infected)</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pain Level (0-10)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.pain_level}
              onChange={(e) => handleInputChange('pain_level', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.pain_level ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.pain_level && (
              <p className="text-red-500 text-sm mt-1">{errors.pain_level}</p>
            )}
          </div>
        </div>

        {/* Periwound Condition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Periwound Condition *
          </label>
          <textarea
            value={formData.periwound_condition}
            onChange={(e) => handleInputChange('periwound_condition', e.target.value)}
            placeholder="Describe the condition of skin around the wound..."
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.periwound_condition ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.periwound_condition && (
            <p className="text-red-500 text-sm mt-1">{errors.periwound_condition}</p>
          )}
        </div>

        {/* Clinical Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="odor"
              checked={formData.odor}
              onChange={(e) => handleInputChange('odor', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="odor" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Odor present
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="infection"
              checked={formData.signs_of_infection}
              onChange={(e) => handleInputChange('signs_of_infection', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="infection" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Signs of infection
            </label>
          </div>
        </div>

        {/* Assessment Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Assessment Notes *
          </label>
          <textarea
            value={formData.assessment_notes}
            onChange={(e) => handleInputChange('assessment_notes', e.target.value)}
            placeholder="Enter detailed assessment notes, observations, and care plan..."
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.assessment_notes ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.assessment_notes && (
            <p className="text-red-500 text-sm mt-1">{errors.assessment_notes}</p>
          )}
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Camera className="inline h-4 w-4 mr-1" />
            Wound Photos
          </label>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="cursor-pointer flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors">
                <Upload className="h-4 w-4" />
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
            </div>
            
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo}
                      alt={`Wound photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center space-x-2"
          >
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{assessment ? 'Update' : 'Save'} Assessment</span>
          </button>
        </div>
      </form>
    </div>
  );
};
