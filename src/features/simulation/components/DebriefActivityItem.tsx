import React, { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, AlertCircle } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ActivityItem: React.FC<{ item: any; sectionKey: string }> = ({ item, sectionKey }) => {
  const [showAssessmentData, setShowAssessmentData] = useState(false);
  
  const formatItem = () => {
    switch (sectionKey) {
      case 'vitals':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{format(new Date(item.recorded_at), 'PPp')}</p>
            <div className="mt-1 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
              <span>BP: {item.blood_pressure_systolic}/{item.blood_pressure_diastolic}</span>
              <span>HR: {item.heart_rate} bpm</span>
              <span>RR: {item.respiratory_rate}/min</span>
              <span>Temp: {item.temperature}°C</span>
              <span>SpO₂: {item.oxygen_saturation}%</span>
              {item.pain_score !== null && <span>Pain: {item.pain_score}/10</span>}
            </div>
          </div>
        );
      case 'medications':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{format(new Date(item.timestamp), 'PPp')}</p>
            <p className="text-gray-900 mt-1 font-semibold">{item.medication_name} via {item.route}</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dose</p>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{item.dosage || '—'}</p>
              </div>
              <div className={`p-2 rounded border ${
                item.administered_dose
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Student Administered</p>
                <p className={`text-sm font-bold mt-0.5 ${
                  item.administered_dose ? 'text-blue-700' : 'text-gray-400 italic'
                }`}>
                  {item.administered_dose || 'Not recorded'}
                </p>
              </div>
            </div>
            <div className="mt-1 flex flex-col space-y-1">
              {item.barcode_scanned ? (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded inline-block w-fit">✓ BCMA Compliant</span>
              ) : (
                <>
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded inline-block w-fit">
                    ⚠ {item.override_reason ? 'BCMA Override' : 'Manual Entry'}
                  </span>
                  {item.override_reason && (
                    <span className="text-xs text-amber-700 font-medium">Reason: {item.override_reason}</span>
                  )}
                </>
              )}
              {item.witness_name && (
                <span className="text-xs text-gray-600">Witnessed by: {item.witness_name}</span>
              )}
            </div>
            {(() => {
              const userNote = item.notes?.replace(/^BCMA Administration\.\s*/i, '').trim();
              return userNote ? (
                <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-gray-700">
                  <span className="font-semibold">Note:</span> {userNote}
                </div>
              ) : null;
            })()}
          </div>
        );
      case 'doctorsOrders':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{format(new Date(item.acknowledged_at), 'PPp')}</p>
            <p className="text-gray-900 mt-1 font-medium">✓ ACKNOWLEDGED</p>
            <p className="text-gray-600 whitespace-pre-wrap">{item.order_text || item.order_type}</p>
          </div>
        );
      case 'intakeOutput':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{format(new Date(item.event_timestamp), 'PPp')}</p>
            <div className="mt-1 flex items-center space-x-3">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                item.direction === 'intake' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {item.direction === 'intake' ? '↓ INTAKE' : '↑ OUTPUT'}
              </span>
              <span className="text-gray-900 font-semibold">{item.amount_ml} mL</span>
              <span className="text-gray-600">{item.category}</span>
            </div>
          </div>
        );
      case 'labOrders':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.ordered_at ? format(new Date(item.ordered_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">{item.test_name}</p>
            <div className="mt-1 flex items-center space-x-2">
              <span className={`text-xs px-2 py-0.5 rounded ${
                item.priority === 'STAT' ? 'bg-red-100 text-red-700' :
                item.priority === 'URGENT' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {item.priority || 'ROUTINE'}
              </span>
              <span className="text-xs text-gray-600">{item.specimen_type}</span>
              <span className="text-xs text-gray-600">Status: {item.status}</span>
            </div>
          </div>
        );
      case 'labAcknowledgements':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.acknowledged_at ? format(new Date(item.acknowledged_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">✓ ACKNOWLEDGED: {item.test_name}</p>
            <div className="mt-1 flex items-center space-x-2">
              <span className="text-gray-900 font-semibold">{item.result_value}</span>
              {item.abnormal_flag && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">⚠ ABNORMAL</span>
              )}
            </div>
            {item.note && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700">
                <span className="font-semibold">Note:</span> {item.note}
              </div>
            )}
          </div>
        );
      case 'hacmapDevices':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.created_at ? format(new Date(item.created_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">🔧 {item.type?.toUpperCase().replace(/-/g, ' ')}</p>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              {item.placement_date && (
                <div><span className="font-semibold">Placement Date:</span> {item.placement_date}</div>
              )}
              {item.inserted_by && (
                <div><span className="font-semibold">Inserted By:</span> {item.inserted_by}</div>
              )}
              {item.location && (
                <div><span className="font-semibold">Location:</span> {item.location}</div>
              )}
              {item.tube_number && (
                <div><span className="font-semibold">Tube #:</span> {item.tube_number}</div>
              )}
              {item.tube_size_fr && (
                <div><span className="font-semibold">Size:</span> {item.tube_size_fr} Fr</div>
              )}
              {item.orientation && item.orientation.length > 0 && (
                <div><span className="font-semibold">Orientation:</span> {item.orientation.join(', ')}</div>
              )}
              {item.number_of_sutures_placed && (
                <div><span className="font-semibold">Sutures:</span> {item.number_of_sutures_placed}</div>
              )}
              {item.reservoir_type && (
                <div><span className="font-semibold">Reservoir:</span> {item.reservoir_type} {item.reservoir_size_ml ? `(${item.reservoir_size_ml} mL)` : ''}</div>
              )}
              {item.securement_method && item.securement_method.length > 0 && (
                <div><span className="font-semibold">Securement:</span> {item.securement_method.join(', ')}</div>
              )}
              {item.patient_tolerance && (
                <div><span className="font-semibold">Patient Tolerance:</span> {item.patient_tolerance}</div>
              )}
              {item.site && (
                <div className="mt-1 p-2 bg-emerald-50 border border-emerald-200 rounded">
                  <span className="font-semibold">Notes:</span> {item.site}
                </div>
              )}
            </div>
          </div>
        );
      case 'hacmapWounds':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.created_at ? format(new Date(item.created_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">🩹 {item.wound_type?.toUpperCase().replace(/-/g, ' ')}</p>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              {item.location && (
                <div><span className="font-semibold">Location:</span> {item.location}</div>
              )}
              {(item.wound_length_cm || item.wound_width_cm || item.wound_depth_cm) && (
                <div>
                  <span className="font-semibold">Measurements:</span> L: {item.wound_length_cm || 'N/A'} × W: {item.wound_width_cm || 'N/A'} × D: {item.wound_depth_cm || 'N/A'} cm
                </div>
              )}
              {item.wound_stage && (
                <div><span className="font-semibold">Stage:</span> {item.wound_stage}</div>
              )}
              {item.wound_appearance && (
                <div><span className="font-semibold">Appearance:</span> {Array.isArray(item.wound_appearance) ? item.wound_appearance.join(', ') : item.wound_appearance}</div>
              )}
              {item.drainage_type && item.drainage_type.length > 0 && (
                <div><span className="font-semibold">Drainage Type:</span> {Array.isArray(item.drainage_type) ? item.drainage_type.join(', ') : item.drainage_type}</div>
              )}
              {item.drainage_amount && (
                <div><span className="font-semibold">Drainage Amount:</span> {item.drainage_amount}</div>
              )}
              {item.wound_description && (
                <div className="mt-1 p-2 bg-rose-50 border border-rose-200 rounded">
                  <span className="font-semibold">Description:</span> {item.wound_description}
                </div>
              )}
            </div>
          </div>
        );
      case 'deviceAssessments':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.assessed_at ? format(new Date(item.assessed_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">🩺 {item.device_type?.toUpperCase().replace(/-/g, ' ')} ASSESSMENT</p>
            <div className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-gray-600">
              {item.status && <span>Status: {item.status}</span>}
              {item.output_amount_ml && <span>Output: {item.output_amount_ml} mL</span>}
              {item.notes && <span className="col-span-2">Notes: {item.notes}</span>}
            </div>
            {item.assessment_data && Object.keys(item.assessment_data).length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowAssessmentData(!showAssessmentData)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 print:hidden"
                >
                  <span>+ {Object.keys(item.assessment_data).length} detailed assessment fields</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showAssessmentData ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showAssessmentData && (
                  <div className="mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      {Object.entries(item.assessment_data).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium text-indigo-900 capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="text-indigo-700 text-right ml-2">
                            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                             Array.isArray(value) ? value.join(', ') : 
                             value?.toString() || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Print view - always show fields */}
                <div className="hidden print:block mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {Object.entries(item.assessment_data).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium text-indigo-900 capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-indigo-700 text-right ml-2">
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                           Array.isArray(value) ? value.join(', ') : 
                           value?.toString() || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'woundAssessments':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.assessed_at ? format(new Date(item.assessed_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">🔍 WOUND ASSESSMENT</p>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              {item.site_condition && (
                <div><span className="font-semibold">Surrounding Skin:</span> {Array.isArray(item.site_condition) ? item.site_condition.join(', ') : item.site_condition}</div>
              )}
              {item.pain_level !== null && (
                <div><span className="font-semibold">Pain Level:</span> {item.pain_level}/10</div>
              )}
              {item.wound_appearance && (
                <div><span className="font-semibold">Wound Appearance:</span> {Array.isArray(item.wound_appearance) ? item.wound_appearance.join(', ') : item.wound_appearance}</div>
              )}
              {item.drainage_type && (
                <div><span className="font-semibold">Drainage Type:</span> {Array.isArray(item.drainage_type) ? item.drainage_type.join(', ') : item.drainage_type}</div>
              )}
              {item.drainage_amount && (
                <div><span className="font-semibold">Drainage Amount:</span> {item.drainage_amount}</div>
              )}
              {item.treatment_applied && (
                <div><span className="font-semibold">Treatment Applied:</span> {item.treatment_applied}</div>
              )}
              {item.dressing_type && (
                <div><span className="font-semibold">Dressing Type:</span> {item.dressing_type}</div>
              )}
              {item.notes && (
                <div className="mt-1 p-2 bg-fuchsia-50 border border-fuchsia-200 rounded">
                  <span className="font-semibold">Assessment Notes:</span> {item.notes}
                </div>
              )}
            </div>
          </div>
        );
      case 'handoverNotes':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">
              {item.entry_type === 'acknowledged' ? 'Note from:' : 'Created:'}{' '}
              {item.created_at ? format(new Date(item.created_at), 'PPp') : 'N/A'}
            </p>
            <div className="mt-2 space-y-2">
              {item.nursing_notes && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Nursing Notes:</span>
                  <p className="text-gray-900 whitespace-pre-wrap">{item.nursing_notes}</p>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Situation:</span>
                <p className="text-gray-900">{item.situation}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Background:</span>
                <p className="text-gray-900">{item.background}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Assessment:</span>
                <p className="text-gray-900">{item.assessment}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Recommendations:</span>
                <p className="text-gray-900">{item.recommendations}</p>
              </div>
              {item.student_name && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                    ✓ Acknowledged by: {item.student_name}
                    {(item.acknowledged_at || item.updated_at) && (
                      <> · {format(new Date((item.acknowledged_at || item.updated_at)!), 'PPp')}</>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      case 'advancedDirectives':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.created_at ? format(new Date(item.created_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">⚕️ ADVANCED DIRECTIVE UPDATED</p>
            <div className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-gray-600">
              {item.dnr_status && <span>DNR Status: {item.dnr_status}</span>}
              {item.living_will_status && <span>Living Will: {item.living_will_status}</span>}
              {item.healthcare_proxy_name && <span>Healthcare Proxy: {item.healthcare_proxy_name}</span>}
              {item.organ_donation_status !== null && <span>Organ Donation: {item.organ_donation_status ? 'Yes' : 'No'}</span>}
              {item.special_instructions && <span className="col-span-2">Instructions: {item.special_instructions}</span>}
            </div>
          </div>
        );
      case 'neuroAssessments': {
        const gcsTot = (item.gcs_eye ?? 0) + (item.gcs_verbal ?? 0) + (item.gcs_motor ?? 0);
        const aOrientCount = [item.oriented_person, item.oriented_place, item.oriented_time].filter(Boolean).length;
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.recorded_at ? format(new Date(item.recorded_at), 'PPp') : 'N/A'}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
              {item.level_of_consciousness && <span><span className="font-semibold">LOC:</span> {item.level_of_consciousness} {item.level_of_consciousness === 'Alert' ? `(A×${aOrientCount})` : ''}</span>}
              {(item.gcs_eye || item.gcs_verbal || item.gcs_motor) ? <span><span className="font-semibold">GCS:</span> E{item.gcs_eye ?? '?'}+V{item.gcs_verbal ?? '?'}+M{item.gcs_motor ?? '?'}={gcsTot || '?'}</span> : null}
              {item.pupils_equal !== null && <span><span className="font-semibold">Pupils equal:</span> {item.pupils_equal ? 'Yes' : 'No'}</span>}
              {item.pupil_left_size && <span><span className="font-semibold">L pupil:</span> {item.pupil_left_size}mm {item.pupil_left_reaction}</span>}
              {item.pupil_right_size && <span><span className="font-semibold">R pupil:</span> {item.pupil_right_size}mm {item.pupil_right_reaction}</span>}
              {item.sensation && <span><span className="font-semibold">Sensation:</span> {item.sensation}</span>}
              {item.speech && <span><span className="font-semibold">Speech:</span> {item.speech}</span>}
              {item.pain_score !== null && <span><span className="font-semibold">Pain:</span> {item.pain_score}/10</span>}
            </div>
            {(item.strength_right_arm !== null || item.strength_left_arm !== null) && (
              <div className="mt-1 text-xs text-gray-600">
                <span className="font-semibold">Strength: </span>
                RA:{item.strength_right_arm ?? '?'} LA:{item.strength_left_arm ?? '?'} RL:{item.strength_right_leg ?? '?'} LL:{item.strength_left_leg ?? '?'}
              </div>
            )}
          </div>
        );
      }
      case 'bbitEntries': {
        const timeStr = item.time_label?.trim() || (item.recorded_at ? format(new Date(item.recorded_at), 'HH:mm') : 'N/A');
        const dateStr = item.recorded_at ? format(new Date(item.recorded_at), 'MMM d') : '';
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{timeStr} {dateStr && <span className="text-gray-500 font-normal">— {dateStr}</span>}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
              {item.glucose_value != null && (
                <span><span className="font-semibold">CBG:</span> {Number(item.glucose_value).toFixed(1)} mmol/L</span>
              )}
              {item.carb_intake && (
                <span><span className="font-semibold">Carbs:</span> {item.carb_intake === 'full' ? 'Full meal' : item.carb_intake === 'partial' ? 'Partial' : 'None'}</span>
              )}
              {item.basal_name && (
                <span><span className="font-semibold">Basal:</span> {item.basal_name} {item.basal_dose != null ? `${item.basal_dose}u` : ''} — {item.basal_status === 'given' ? '✓ Given' : '⊘ Held'}</span>
              )}
              {item.bolus_meal && (
                <span><span className="font-semibold">Bolus ({item.bolus_meal}):</span> {item.bolus_dose != null ? `${item.bolus_dose}u` : '—'} — {item.bolus_status === 'given' ? '✓ Given' : '⊘ Not given'}</span>
              )}
              {item.correction_status === 'given' && item.correction_dose != null && (
                <span><span className="font-semibold">Correction:</span> {item.correction_dose}u given</span>
              )}
            </div>
          </div>
        );
      }
      case 'newbornAssessments': {
        const dateStr = item.recorded_at ? format(new Date(item.recorded_at), 'PPp') : 'N/A';
        const apgarParts = [
          item.apgar_1min != null && `1 min: ${item.apgar_1min}`,
          item.apgar_5min != null && `5 min: ${item.apgar_5min}`,
          item.apgar_10min != null && `10 min: ${item.apgar_10min}`,
        ].filter(Boolean).join(' · ');

        // Map system keys to display labels (in assessment order)
        const systemLabels: Record<string, string> = {
          head: 'Head', neck: 'Neck', chest: 'Chest',
          cardiovascular: 'Cardiovascular', respiratory: 'Respiratory',
          abdomen: 'Abdomen', skeletal: 'Skeletal', genitalia: 'Genitalia',
          skin: 'Skin', neuromuscular: 'Neuromuscular',
        };

        // Process nested physical_observations structure (obs.system.field_normal / field_variance)
        const obs = (item.physical_observations ?? {}) as Record<string, Record<string, unknown>>;
        const systemSummaries = Object.entries(systemLabels)
          .map(([key, label]) => {
            const sysObs = obs[key];
            if (!sysObs || typeof sysObs !== 'object') return null;
            const normals: string[] = [];
            const variances: string[] = [];
            const others: string[] = [];
            Object.entries(sysObs).forEach(([field, val]) => {
              if (field.endsWith('_normal') && Array.isArray(val) && val.length > 0) {
                normals.push(...(val as string[]));
              } else if (field.endsWith('_variance') && Array.isArray(val) && val.length > 0) {
                variances.push(...(val as string[]));
              } else if (field.endsWith('_variance_specify') && typeof val === 'string' && val.trim()) {
                variances.push(val.trim());
              } else if (field.endsWith('_other') && typeof val === 'string' && val.trim()) {
                others.push(val.trim());
              }
            });
            if (normals.length === 0 && variances.length === 0 && others.length === 0) return null;
            return { label, normals, variances, others };
          })
          .filter(Boolean) as { label: string; normals: string[]; variances: string[]; others: string[] }[];

        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{dateStr}</p>

            {/* Birth Measurements */}
            {(item.weight_grams || item.length_cm || item.head_circumference_cm || item.time_of_birth) && (
              <div className="mt-1 text-xs text-gray-600">
                <span className="font-semibold">Measurements: </span>
                {item.time_of_birth && <span>TOB: {item.time_of_birth} </span>}
                {item.weight_grams && <span>· Weight: {item.weight_grams}g </span>}
                {item.length_cm && <span>· Length: {item.length_cm}cm </span>}
                {item.head_circumference_cm && <span>· HC: {item.head_circumference_cm}cm</span>}
              </div>
            )}

            {/* APGAR scores */}
            {apgarParts && (
              <p className="mt-1 text-xs text-gray-600">
                <span className="font-semibold">APGAR: </span>{apgarParts}
              </p>
            )}

            {/* Medications */}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
              {item.vitamin_k_declined ? (
                <span className="text-amber-600 font-medium">Vitamin K: Declined</span>
              ) : item.vitamin_k_given ? (
                <span className="text-gray-600">
                  Vitamin K: ✓ Given
                  {item.vitamin_k_dose ? ` (${item.vitamin_k_dose})` : ''}
                  {item.vitamin_k_site ? ` — ${item.vitamin_k_site}` : ''}
                  {item.vitamin_k_time ? ` at ${item.vitamin_k_time}` : ''}
                </span>
              ) : null}
              {item.erythromycin_given && (
                <span className="text-gray-600">
                  Erythromycin: ✓ Given{item.erythromycin_time ? ` at ${item.erythromycin_time}` : ''}
                </span>
              )}
            </div>

            {/* Physical Assessment by body system */}
            {systemSummaries.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-gray-700 mb-1">Physical Assessment:</p>
                <div className="space-y-0.5">
                  {systemSummaries.map(({ label, normals, variances, others }) => (
                    <div key={label} className="text-xs leading-relaxed">
                      <span className="font-medium text-gray-600">{label}: </span>
                      {normals.length > 0 && (
                        <span className="text-green-700">{normals.join(', ')}</span>
                      )}
                      {variances.length > 0 && (
                        <span className="text-amber-700">
                          {normals.length > 0 ? ' · ' : ''}
                          <span className="font-medium">Variance: </span>
                          {variances.join(', ')}
                        </span>
                      )}
                      {others.length > 0 && (
                        <span className="text-gray-500"> ({others.join('; ')})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.completed_by && (
              <p className="mt-1 text-xs text-gray-400">Assessed by: {item.completed_by}</p>
            )}
          </div>
        );
      }
      default: {
        // Safely get timestamp with fallback chain and null check
        const timestamp = item.created_at || item.recorded_at || item.timestamp || item.event_timestamp || item.ordered_at || item.acknowledged_at;
        const dateStr = timestamp && !isNaN(new Date(timestamp).getTime()) 
          ? format(new Date(timestamp), 'PPp')
          : 'N/A';
        
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{dateStr}</p>
            <p className="text-gray-600 mt-1">{JSON.stringify(item).substring(0, 100)}...</p>
          </div>
        );
      }
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors activity-item">
      {formatItem()}
    </div>
  );
};
