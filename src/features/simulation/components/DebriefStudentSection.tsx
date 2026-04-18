import React, { useState } from 'react';
import type { StudentActivity } from '../../../services/simulation/studentActivityService';
import { ActivitySection } from './DebriefActivitySection';

// Student Activity Section Component
export const StudentActivitySection: React.FC<{ student: StudentActivity; forceExpanded?: boolean }> = ({ student, forceExpanded = false }) => {
  // If forceExpanded, start with all sections expanded
  const sectionsData = [
    { key: 'vitals', title: 'Vital Signs', items: student.activities.vitals || [], color: 'blue', icon: '💓' },
    { key: 'medications', title: 'Medications (BCMA)', items: student.activities.medications || [], color: 'purple', icon: '💊' },
    { key: 'doctorsOrders', title: "Doctor's Orders", items: student.activities.doctorsOrders || [], color: 'pink', icon: '📋' },
    { key: 'labAcknowledgements', title: 'Lab Acknowledgements', items: student.activities.labAcknowledgements || [], color: 'teal', icon: '🧪' },
    { key: 'labOrders', title: 'Lab Orders', items: student.activities.labOrders || [], color: 'green', icon: '🔬' },
    { key: 'intakeOutput', title: 'Intake & Output', items: student.activities.intakeOutput || [], color: 'cyan', icon: '💧' },
    { key: 'patientNotes', title: 'Patient Notes', items: student.activities.patientNotes || [], color: 'yellow', icon: '📝' },
    { key: 'handoverNotes', title: 'Handover Notes', items: student.activities.handoverNotes || [], color: 'orange', icon: '🤝' },
    { key: 'advancedDirectives', title: 'Advanced Directives', items: student.activities.advancedDirectives || [], color: 'red', icon: '⚕️' },
    { key: 'hacmapDevices', title: 'hacMap - Add Device', items: student.activities.hacmapDevices || [], color: 'emerald', icon: '🔧' },
    { key: 'hacmapWounds', title: 'hacMap - Add Wound', items: student.activities.hacmapWounds || [], color: 'rose', icon: '🩹' },
    { key: 'deviceAssessments', title: 'Device Assessments', items: student.activities.deviceAssessments || [], color: 'indigo', icon: '🩺' },
    { key: 'woundAssessments', title: 'Wound Assessments', items: student.activities.woundAssessments || [], color: 'fuchsia', icon: '🔍' },
    { key: 'bowelAssessments', title: 'Bowel Assessments', items: student.activities.bowelAssessments || [], color: 'amber', icon: '📊' },
    { key: 'neuroAssessments', title: 'Neuro Assessments', items: student.activities.neuroAssessments || [], color: 'violet', icon: '🧠' },
    { key: 'bbitEntries', title: 'BBIT Chart', items: student.activities.bbitEntries || [], color: 'purple', icon: '🩸' },
    { key: 'newbornAssessments', title: 'Newborn Assessment', items: student.activities.newbornAssessments || [], color: 'cyan', icon: '👶' }
  ].filter(s => s.items.length > 0);
  
  const initialExpanded = forceExpanded 
    ? new Set(sectionsData.map(s => s.key))
    : new Set<string>();
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(initialExpanded);

  const toggleSection = (section: string) => {
    if (forceExpanded) return; // Don't allow toggling in print mode
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm student-section">
      {/* Student Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {student.studentName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">{student.studentName}</h4>
              <p className="text-gray-300 text-sm">{student.totalEntries} total clinical entries</p>
            </div>
          </div>
          <div className="flex space-x-2">
            {sectionsData.slice(0, 5).map(s => (
              <div key={s.key} className="text-center">
                <div className="text-2xl">{s.icon}</div>
                <div className="text-white text-xs font-semibold">{s.items.length}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Sections */}
      <div className="divide-y divide-gray-200">
        {sectionsData.map(section => (
          <ActivitySection
            key={section.key}
            section={section}
            isExpanded={expandedSections.has(section.key)}
            onToggle={() => toggleSection(section.key)}
          />
        ))}
      </div>
    </div>
  );
};

