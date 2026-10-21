import React from 'react';
import { Activity, FileText, Info, Target } from 'lucide-react';
import type { HandoverNote } from '../../../../services/patient/handoverService';

const SECTIONS = [
  { key: 'situation', title: 'Situation', icon: Info, box: 'bg-blue-50 border border-blue-200', iconColor: 'text-blue-600', titleColor: 'text-blue-800' },
  { key: 'background', title: 'Background', icon: FileText, box: 'bg-green-50 border border-green-200', iconColor: 'text-green-600', titleColor: 'text-green-800' },
  { key: 'assessment', title: 'Assessment', icon: Activity, box: 'bg-yellow-50 border border-yellow-200', iconColor: 'text-yellow-600', titleColor: 'text-yellow-800' },
  { key: 'recommendations', title: 'Recommendations', icon: Target, box: 'bg-purple-50 border border-purple-200', iconColor: 'text-purple-600', titleColor: 'text-purple-800' },
] as const;

export const HandoverNoteDetails: React.FC<{ note: HandoverNote }> = ({ note }) => (
  <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
    {note.nursing_notes && (
      <div className="p-4 rounded-lg bg-teal-50 border border-teal-200">
        <div className="flex items-center space-x-2 mb-2">
          <FileText className="h-4 w-4 text-teal-600" />
          <span className="font-medium text-teal-800">Nursing Notes</span>
        </div>
        <p className="text-gray-700 whitespace-pre-wrap">{note.nursing_notes}</p>
      </div>
    )}
    {SECTIONS.map(({ key, title, icon: Icon, box, iconColor, titleColor }) => (
      <div key={key} className={`p-4 rounded-lg ${box}`}>
        <div className="flex items-center space-x-2 mb-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className={`font-medium ${titleColor}`}>{title}</span>
        </div>
        <p className="text-gray-700 whitespace-pre-wrap">{note[key]}</p>
      </div>
    ))}
  </div>
);
