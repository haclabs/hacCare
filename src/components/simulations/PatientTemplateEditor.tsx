import React, { useState, useEffect } from 'react';
import { Plus, Save, X, Trash2, User, Heart, Pill, FileText, AlertTriangle } from 'lucide-react';
import { SimulationSubTenantService } from '../../lib/simulationSubTenantService';

interface PatientTemplate {
  id?: string;
  scenario_template_id: string;
  template_name: string;
  patient_name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  date_of_birth?: string;
  room_number?: string;
  bed_number?: string;
  diagnosis: string;
  condition: 'Critical' | 'Stable' | 'Improving' | 'Discharged';
  allergies?: string[];
  blood_type?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  assigned_nurse?: string;
}

interface VitalTemplate {
  id?: string;
  vital_type: string;
  value_systolic?: number;
  value_diastolic?: number;
  value_numeric?: number;
  value_text?: string;
  unit: string;
  normal_range_min?: number;
  normal_range_max?: number;
}

interface MedicationTemplate {
  id?: string;
  medication_name: string;
  dosage: string;
  route: string;
  frequency: string;
  start_date?: string;
  end_date?: string;
  indication?: string;
  special_instructions?: string;
  is_prn: boolean;
  is_active: boolean;
}

interface NoteTemplate {
  id?: string;
  note_type: string;
  note_content: string;
  created_by_role: string;
}

interface PatientTemplateEditorProps {
  scenarioId: string;
  onClose: () => void;
  onSave: () => void;
  editingTemplate?: PatientTemplate;
}

const PatientTemplateEditor: React.FC<PatientTemplateEditorProps> = ({
  scenarioId,
  onClose,
  onSave,
  editingTemplate
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'vitals' | 'medications' | 'notes'>('info');
  const [saving, setSaving] = useState(false);

  // Patient Info State
  const [patientInfo, setPatientInfo] = useState<PatientTemplate>(() => {
    const defaultInfo = {
      scenario_template_id: scenarioId,
      template_name: '',
      patient_name: '',
      age: 30,
      gender: 'Male' as const,
      diagnosis: '',
      condition: 'Stable' as const,
      allergies: []
    };
    
    // If editing an existing template, merge with defaults
    if (editingTemplate) {
      return { ...defaultInfo, ...editingTemplate };
    }
    
    return defaultInfo;
  });

  // Vitals State
  const [vitals, setVitals] = useState<VitalTemplate[]>([
    { vital_type: 'blood_pressure', value_systolic: 120, value_diastolic: 80, unit: 'mmHg' },
    { vital_type: 'heart_rate', value_numeric: 72, unit: 'bpm' },
    { vital_type: 'temperature', value_numeric: 98.6, unit: '°F' },
    { vital_type: 'respiratory_rate', value_numeric: 16, unit: '/min' },
    { vital_type: 'oxygen_saturation', value_numeric: 98, unit: '%' }
  ]);

  // Medications State
  const [medications, setMedications] = useState<MedicationTemplate[]>([]);

  // Notes State
  const [notes, setNotes] = useState<NoteTemplate[]>([
    { note_type: 'admission', note_content: '', created_by_role: 'nurse' }
  ]);

  const [newAllergy, setNewAllergy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing template data when editing
  useEffect(() => {
    const loadTemplateData = async () => {
      if (editingTemplate?.id) {
        console.log('Loading template data for editing:', editingTemplate.id);
        try {
          setLoading(true);
          setError(null);
          
          // Import supabase directly
          const { supabase } = await import('../../lib/supabase');
          
          // Load related vitals templates
          const vitalsData = await supabase
            .from('patient_vitals_templates')
            .select('*')
            .eq('patient_template_id', editingTemplate.id);
          
          if (vitalsData.data) {
            setVitals(vitalsData.data);
          }

          // Load related medications templates
          const medicationsData = await supabase
            .from('patient_medications_templates')
            .select('*')
            .eq('patient_template_id', editingTemplate.id);
          
          if (medicationsData.data) {
            setMedications(medicationsData.data);
          }

          // Load related notes templates
          const notesData = await supabase
            .from('patient_notes_templates')
            .select('*')
            .eq('patient_template_id', editingTemplate.id);
          
          if (notesData.data) {
            setNotes(notesData.data);
          }

          console.log('Loaded template data:', { 
            vitals: vitalsData.data, 
            medications: medicationsData.data, 
            notes: notesData.data 
          });
        } catch (error) {
          console.error('Error loading template data:', error);
          setError('Failed to load template data');
        } finally {
          setLoading(false);
        }
      }
    };

    loadTemplateData();
  }, [editingTemplate?.id]);

  const handleAddAllergy = () => {
    if (newAllergy.trim() && !patientInfo.allergies?.includes(newAllergy.trim())) {
      setPatientInfo({
        ...patientInfo,
        allergies: [...(patientInfo.allergies || []), newAllergy.trim()]
      });
      setNewAllergy('');
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    setPatientInfo({
      ...patientInfo,
      allergies: patientInfo.allergies?.filter(a => a !== allergy) || []
    });
  };

  const handleAddVital = () => {
    setVitals([...vitals, {
      vital_type: 'custom',
      value_numeric: 0,
      unit: ''
    }]);
  };

  const handleUpdateVital = (index: number, field: string, value: any) => {
    const updatedVitals = [...vitals];
    updatedVitals[index] = { ...updatedVitals[index], [field]: value };
    setVitals(updatedVitals);
  };

  const handleRemoveVital = (index: number) => {
    setVitals(vitals.filter((_, i) => i !== index));
  };

  const handleAddMedication = () => {
    setMedications([...medications, {
      medication_name: '',
      dosage: '',
      route: 'oral',
      frequency: 'BID',
      indication: '',
      is_prn: false,
      is_active: true
    }]);
  };

  const handleUpdateMedication = (index: number, field: string, value: any) => {
    const updatedMeds = [...medications];
    updatedMeds[index] = { ...updatedMeds[index], [field]: value };
    setMedications(updatedMeds);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleAddNote = () => {
    setNotes([...notes, {
      note_type: 'progress',
      note_content: '',
      created_by_role: 'nurse'
    }]);
  };

  const handleUpdateNote = (index: number, field: string, value: any) => {
    const updatedNotes = [...notes];
    updatedNotes[index] = { ...updatedNotes[index], [field]: value };
    setNotes(updatedNotes);
  };

  const handleRemoveNote = (index: number) => {
    setNotes(notes.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate required fields
      console.log('Validating template data:', {
        template_name: patientInfo.template_name,
        patient_name: patientInfo.patient_name,
        diagnosis: patientInfo.diagnosis
      });

      if (!patientInfo.template_name?.trim() || !patientInfo.patient_name?.trim() || !patientInfo.diagnosis?.trim()) {
        alert('Please fill in all required fields (Template Name, Patient Name, Diagnosis)');
        return;
      }

      console.log('Saving patient template:', {
        patientInfo,
        vitals,
        medications,
        notes
      });

      // Save the complete patient template
      await SimulationSubTenantService.saveCompletePatientTemplate(
        scenarioId,
        patientInfo,
        vitals,
        medications,
        notes
      );

      alert('Patient template saved successfully!');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving patient template:', error);
      alert(`Failed to save patient template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingTemplate ? 'Edit' : 'Create'} Patient Template
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <p className="ml-3 text-sm text-blue-800">Loading template data...</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'info', name: 'Patient Info', icon: User },
              { id: 'vitals', name: 'Initial Vitals', icon: Heart },
              { id: 'medications', name: 'Medications', icon: Pill },
              { id: 'notes', name: 'Initial Notes', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={patientInfo.template_name}
                    onChange={(e) => setPatientInfo({ ...patientInfo, template_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Patient A - Cardiac"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    value={patientInfo.patient_name}
                    onChange={(e) => setPatientInfo({ ...patientInfo, patient_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                  <input
                    type="number"
                    value={patientInfo.age}
                    onChange={(e) => setPatientInfo({ ...patientInfo, age: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                  <select
                    value={patientInfo.gender}
                    onChange={(e) => setPatientInfo({ ...patientInfo, gender: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                  <input
                    type="text"
                    value={patientInfo.room_number || ''}
                    onChange={(e) => setPatientInfo({ ...patientInfo, room_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 302"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bed Number</label>
                  <input
                    type="text"
                    value={patientInfo.bed_number || ''}
                    onChange={(e) => setPatientInfo({ ...patientInfo, bed_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis *</label>
                <textarea
                  value={patientInfo.diagnosis}
                  onChange={(e) => setPatientInfo({ ...patientInfo, diagnosis: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Acute Myocardial Infarction"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                  <select
                    value={patientInfo.condition}
                    onChange={(e) => setPatientInfo({ ...patientInfo, condition: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Critical">Critical</option>
                    <option value="Stable">Stable</option>
                    <option value="Improving">Improving</option>
                    <option value="Discharged">Discharged</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                  <select
                    value={patientInfo.blood_type || ''}
                    onChange={(e) => setPatientInfo({ ...patientInfo, blood_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select blood type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Allergies
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddAllergy()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add allergy"
                  />
                  <button
                    onClick={handleAddAllergy}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {patientInfo.allergies?.map((allergy, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-sm rounded-md"
                    >
                      {allergy}
                      <button
                        onClick={() => handleRemoveAllergy(allergy)}
                        className="ml-1 text-red-600 hover:text-red-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vitals' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Initial Vitals</h3>
                <button
                  onClick={handleAddVital}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Vital
                </button>
              </div>

              <div className="space-y-3">
                {vitals.map((vital, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vital Type</label>
                        <select
                          value={vital.vital_type}
                          onChange={(e) => handleUpdateVital(index, 'vital_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="blood_pressure">Blood Pressure</option>
                          <option value="heart_rate">Heart Rate</option>
                          <option value="temperature">Temperature</option>
                          <option value="respiratory_rate">Respiratory Rate</option>
                          <option value="oxygen_saturation">Oxygen Saturation</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      {vital.vital_type === 'blood_pressure' ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Systolic</label>
                            <input
                              type="number"
                              value={vital.value_systolic || ''}
                              onChange={(e) => handleUpdateVital(index, 'value_systolic', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Diastolic</label>
                            <input
                              type="number"
                              value={vital.value_diastolic || ''}
                              onChange={(e) => handleUpdateVital(index, 'value_diastolic', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                          <input
                            type="number"
                            step="0.1"
                            value={vital.value_numeric || ''}
                            onChange={(e) => handleUpdateVital(index, 'value_numeric', parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                          <input
                            type="text"
                            value={vital.unit}
                            onChange={(e) => handleUpdateVital(index, 'unit', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => handleRemoveVital(index)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-md"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'medications' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Initial Medications</h3>
                <button
                  onClick={handleAddMedication}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Medication
                </button>
              </div>

              <div className="space-y-3">
                {medications.map((med, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name</label>
                        <input
                          type="text"
                          value={med.medication_name}
                          onChange={(e) => handleUpdateMedication(index, 'medication_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Metoprolol"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => handleUpdateMedication(index, 'dosage', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 25mg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                        <select
                          value={med.route}
                          onChange={(e) => handleUpdateMedication(index, 'route', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="oral">Oral</option>
                          <option value="IV">IV</option>
                          <option value="IM">IM</option>
                          <option value="sublingual">Sublingual</option>
                          <option value="topical">Topical</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                        <select
                          value={med.frequency}
                          onChange={(e) => handleUpdateMedication(index, 'frequency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="BID">BID (twice daily)</option>
                          <option value="TID">TID (three times daily)</option>
                          <option value="QID">QID (four times daily)</option>
                          <option value="Q6H">Q6H (every 6 hours)</option>
                          <option value="Q8H">Q8H (every 8 hours)</option>
                          <option value="Q12H">Q12H (every 12 hours)</option>
                          <option value="PRN">PRN (as needed)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Indication</label>
                        <input
                          type="text"
                          value={med.indication || ''}
                          onChange={(e) => handleUpdateMedication(index, 'indication', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Hypertension"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                        <input
                          type="text"
                          value={med.special_instructions || ''}
                          onChange={(e) => handleUpdateMedication(index, 'special_instructions', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Take with food"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={med.is_prn}
                            onChange={(e) => handleUpdateMedication(index, 'is_prn', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">PRN (As Needed)</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={med.is_active}
                            onChange={(e) => handleUpdateMedication(index, 'is_active', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Active</span>
                        </label>
                      </div>
                      <button
                        onClick={() => handleRemoveMedication(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Initial Notes</h3>
                <button
                  onClick={handleAddNote}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Note
                </button>
              </div>

              <div className="space-y-3">
                {notes.map((note, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Note Type</label>
                        <select
                          value={note.note_type}
                          onChange={(e) => handleUpdateNote(index, 'note_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="admission">Admission Note</option>
                          <option value="progress">Progress Note</option>
                          <option value="nursing">Nursing Assessment</option>
                          <option value="physician">Physician Note</option>
                          <option value="discharge">Discharge Note</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Created By Role</label>
                        <select
                          value={note.created_by_role}
                          onChange={(e) => handleUpdateNote(index, 'created_by_role', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="nurse">Nurse</option>
                          <option value="doctor">Doctor</option>
                          <option value="system">System</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Note Content</label>
                      <textarea
                        value={note.note_content}
                        onChange={(e) => handleUpdateNote(index, 'note_content', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter note content..."
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleRemoveNote(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !patientInfo.template_name.trim() || !patientInfo.patient_name.trim() || !patientInfo.diagnosis.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientTemplateEditor;