/**
 * ===========================================================================
 * CREATE PATIENT TEMPLATE MODAL
 * ===========================================================================
 * Form to create a new single-patient template: the dedicated tenant, the
 * patient_templates row, AND the patient's chart demographics in one step
 * (mirrors the fields on the standard Add Patient form, minus Admission Date
 * — that gets stamped fresh to CURRENT_DATE whenever this patient is later
 * copied into a simulation template, since a library patient may sit unused
 * for months before being reused).
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { X, UserCog, AlertCircle, Tag, User, MapPin, Phone } from 'lucide-react';
import { createPatientTemplate, deletePatientTemplate } from '../../../services/simulation/patientTemplateService';
import { createPatientWithTenant } from '../../../services/patient/multiTenantPatientService';
import { getPrograms, type Program } from '../../../services/admin/programService';
import { useTenant } from '../../../contexts/TenantContext';
import { useUserProgramAccess } from '../../../hooks/useUserProgramAccess';
import { supabase } from '../../../lib/api/supabase';
import { secureLogger } from '../../../lib/security/secureLogger';
import { generateSecurePatientId } from '../../../utils/secureRandom';
import { sanitizeUserInput } from '../../../utils/sanitization';
import { PATIENT_AVATARS, getRandomAvatarId } from '../../../data/patientAvatars';

interface CreatePatientTemplateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface PatientFieldsState {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  blood_type: string;
  avatar_id: string;
  room_number: string;
  bed_number: string;
  condition: string;
  diagnosis: string;
  allergies: string[];
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
}

const initialPatientFields: PatientFieldsState = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'Male',
  blood_type: 'O+',
  avatar_id: getRandomAvatarId(),
  room_number: '',
  bed_number: 'A',
  condition: 'Stable',
  diagnosis: '',
  allergies: [],
  emergency_contact_name: '',
  emergency_contact_relationship: '',
  emergency_contact_phone: '',
};

const CreatePatientTemplateModal: React.FC<CreatePatientTemplateModalProps> = ({ onClose, onSuccess }) => {
  const { currentTenant } = useTenant();
  const { programCodes, isInstructor } = useUserProgramAccess();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [patientFields, setPatientFields] = useState<PatientFieldsState>(initialPatientFields);
  const [newAllergy, setNewAllergy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const updatePatientField = <K extends keyof PatientFieldsState>(field: K, value: PatientFieldsState[K]) => {
    setPatientFields(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addAllergy = () => {
    const trimmed = newAllergy.trim();
    if (trimmed && !patientFields.allergies.includes(trimmed)) {
      updatePatientField('allergies', [...patientFields.allergies, trimmed]);
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    updatePatientField('allergies', patientFields.allergies.filter((_, i) => i !== index));
  };

  const loadPrograms = async () => {
    if (!currentTenant) return;

    let data: Program[] | null = null;
    let error: any = null;

    if (currentTenant.program_id) {
      const result = await supabase
        .from('programs')
        .select('*')
        .eq('id', currentTenant.program_id)
        .single();
      data = result.data ? [result.data] : null;
      error = result.error;
    } else {
      const result = await getPrograms(currentTenant.id);
      data = result.data;
      error = result.error;
    }

    if (!error && data) {
      setPrograms(data);

      if (isInstructor && programCodes && programCodes.length > 0) {
        const userProgramIds = data
          .filter(p => programCodes.includes(p.code))
          .map(p => p.id);
        setSelectedProgramIds(userProgramIds);
      }
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPrograms();
  }, [currentTenant]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (!patientFields.first_name.trim()) errors.first_name = 'First name is required';
    if (!patientFields.last_name.trim()) errors.last_name = 'Last name is required';
    if (!patientFields.date_of_birth) errors.date_of_birth = 'Date of birth is required';
    if (!patientFields.room_number.trim()) errors.room_number = 'Room number is required';
    if (!patientFields.diagnosis.trim()) errors.diagnosis = 'Diagnosis is required';
    if (!patientFields.emergency_contact_name.trim()) errors.emergency_contact_name = 'Emergency contact name is required';
    if (!patientFields.emergency_contact_relationship.trim()) errors.emergency_contact_relationship = 'Relationship is required';
    if (!patientFields.emergency_contact_phone.trim()) errors.emergency_contact_phone = 'Emergency contact phone is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);
    let createdTemplateId: string | undefined;

    try {
      const selectedPrograms = programs
        .filter(p => selectedProgramIds.includes(p.id))
        .map(p => p.code);

      const result = await createPatientTemplate({
        ...formData,
        primary_categories: selectedPrograms.length > 0 ? selectedPrograms : undefined,
      });

      if (!result.success || !result.tenant_id || !result.patient_template_id) {
        setError(result.message || 'Failed to create patient template');
        return;
      }
      createdTemplateId = result.patient_template_id;

      const sanitize = (v: string) => sanitizeUserInput(v);
      const { data: patient, error: patientError } = await createPatientWithTenant(
        {
          patient_id: generateSecurePatientId(),
          first_name: sanitize(patientFields.first_name),
          last_name: sanitize(patientFields.last_name),
          date_of_birth: patientFields.date_of_birth,
          gender: patientFields.gender,
          room_number: sanitize(patientFields.room_number),
          bed_number: sanitize(patientFields.bed_number),
          admission_date: new Date().toISOString().split('T')[0],
          condition: patientFields.condition,
          diagnosis: sanitize(patientFields.diagnosis),
          allergies: patientFields.allergies.map(sanitize),
          blood_type: patientFields.blood_type,
          emergency_contact_name: sanitize(patientFields.emergency_contact_name),
          emergency_contact_relationship: sanitize(patientFields.emergency_contact_relationship),
          emergency_contact_phone: patientFields.emergency_contact_phone,
          avatar_id: patientFields.avatar_id,
        },
        result.tenant_id
      );

      if (patientError || !patient) {
        // Roll back the just-created (now-orphaned) template + tenant rather than
        // leaving an empty, patient-less patient template behind.
        await deletePatientTemplate(createdTemplateId);
        setError(patientError?.message || 'Failed to create the patient record');
        return;
      }

      onSuccess();
    } catch (err: unknown) {
      secureLogger.error('Error creating patient template:', err);
      if (createdTemplateId) {
        await deletePatientTemplate(createdTemplateId).catch(() => {});
      }
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-lg">
              <UserCog className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Create Patient Template</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <strong>Creating a patient template will:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Create a new dedicated tenant with this patient already in it</li>
                  <li>Let you keep building the patient's full chart (meds, orders, labs, vitals...)</li>
                  <li>Save a snapshot so it can be added into any simulation template later</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Template metadata */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                Patient Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Fred Jones — CHF Exacerbation"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none ${
                  fieldErrors.description ? 'border-red-300' : 'border-slate-300'
                }`}
                placeholder="Describe the scenario this patient represents, so instructors can find it later..."
              />
              {fieldErrors.description && <p className="text-red-600 text-xs mt-1">{fieldErrors.description}</p>}
            </div>

            {programs.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Tag className="inline h-4 w-4 mr-1" />
                  Program Categories
                </label>
                <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 space-y-2">
                  {programs.map((program) => {
                    const isUserProgram = programCodes?.includes(program.code);
                    const isDisabled = isInstructor && !isUserProgram;

                    return (
                      <label
                        key={program.id}
                        className={`flex items-center gap-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProgramIds.includes(program.id)}
                          disabled={isDisabled}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProgramIds([...selectedProgramIds, program.id]);
                            } else {
                              setSelectedProgramIds(selectedProgramIds.filter(id => id !== program.id));
                            }
                          }}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                        />
                        <span className="text-sm">
                          <span className="font-medium text-purple-600">{program.code}</span>
                          {' - '}
                          {program.name}
                          {isUserProgram && (
                            <span className="ml-2 text-xs text-green-600">(Your Program)</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Patient demographics */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
              <User className="h-4 w-4 mr-2 text-blue-600" />
              Patient Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={patientFields.first_name}
                  onChange={(e) => updatePatientField('first_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.first_name ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.first_name && <p className="text-red-600 text-xs mt-1">{fieldErrors.first_name}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={patientFields.last_name}
                  onChange={(e) => updatePatientField('last_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.last_name ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.last_name && <p className="text-red-600 text-xs mt-1">{fieldErrors.last_name}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  value={patientFields.date_of_birth}
                  onChange={(e) => updatePatientField('date_of_birth', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.date_of_birth ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.date_of_birth && <p className="text-red-600 text-xs mt-1">{fieldErrors.date_of_birth}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                <select
                  value={patientFields.gender}
                  onChange={(e) => updatePatientField('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Blood Type</label>
                <select
                  value={patientFields.blood_type}
                  onChange={(e) => updatePatientField('blood_type', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Avatar selection */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700 mb-2">Patient Avatar</label>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {PATIENT_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => updatePatientField('avatar_id', avatar.id)}
                    className={`relative rounded-lg overflow-hidden transition-all hover:scale-110 ${
                      patientFields.avatar_id === avatar.id
                        ? 'ring-4 ring-blue-500 ring-offset-1 scale-105'
                        : 'ring-1 ring-slate-300 hover:ring-blue-300'
                    }`}
                    title={avatar.name}
                  >
                    <div className="aspect-square" dangerouslySetInnerHTML={{ __html: avatar.svg }} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Room & medical info */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-blue-600" />
              Room & Medical Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Room Number *</label>
                <input
                  type="text"
                  value={patientFields.room_number}
                  onChange={(e) => updatePatientField('room_number', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.room_number ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="302"
                />
                {fieldErrors.room_number && <p className="text-red-600 text-xs mt-1">{fieldErrors.room_number}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Bed</label>
                <select
                  value={patientFields.bed_number}
                  onChange={(e) => updatePatientField('bed_number', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {['A', 'B', 'C', 'D'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Condition</label>
                <select
                  value={patientFields.condition}
                  onChange={(e) => updatePatientField('condition', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {['Stable', 'Guarded', 'Critical', 'Improving'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">Diagnosis *</label>
              <textarea
                value={patientFields.diagnosis}
                onChange={(e) => updatePatientField('diagnosis', e.target.value)}
                rows={2}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none ${
                  fieldErrors.diagnosis ? 'border-red-300' : 'border-slate-300'
                }`}
                placeholder="Enter primary diagnosis and relevant medical conditions..."
              />
              {fieldErrors.diagnosis && <p className="text-red-600 text-xs mt-1">{fieldErrors.diagnosis}</p>}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">Allergies</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllergy(); } }}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Penicillin"
                />
                <button
                  type="button"
                  onClick={addAllergy}
                  className="px-3 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Add
                </button>
              </div>
              {patientFields.allergies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {patientFields.allergies.map((allergy, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded-full"
                    >
                      {allergy}
                      <button type="button" onClick={() => removeAllergy(i)} className="hover:text-red-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Emergency contact */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
              <Phone className="h-4 w-4 mr-2 text-blue-600" />
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Contact Name *</label>
                <input
                  type="text"
                  value={patientFields.emergency_contact_name}
                  onChange={(e) => updatePatientField('emergency_contact_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.emergency_contact_name ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.emergency_contact_name && <p className="text-red-600 text-xs mt-1">{fieldErrors.emergency_contact_name}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Relationship *</label>
                <input
                  type="text"
                  value={patientFields.emergency_contact_relationship}
                  onChange={(e) => updatePatientField('emergency_contact_relationship', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.emergency_contact_relationship ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.emergency_contact_relationship && <p className="text-red-600 text-xs mt-1">{fieldErrors.emergency_contact_relationship}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={patientFields.emergency_contact_phone}
                  onChange={(e) => updatePatientField('emergency_contact_phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.emergency_contact_phone ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.emergency_contact_phone && <p className="text-red-600 text-xs mt-1">{fieldErrors.emergency_contact_phone}</p>}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Patient Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePatientTemplateModal;
