import React from 'react';
import { FileText, Plus } from 'lucide-react';
import type { MarkerWithDetails, Assessment, DeviceAssessment } from '../../../types/hacmap';
import { DEVICE_TYPE_LABELS, WOUND_TYPE_LABELS } from '../../../types/hacmap';

interface AvatarRecordsListProps {
  markers: MarkerWithDetails[];
  selectedRecordId: string | null;
  selectedRecordType: 'device' | 'wound' | null;
  currentAssessments: (DeviceAssessment | Assessment)[];
  currentAssessmentCount: number;
  loadingAssessments: boolean;
  onRecordSelect: (markerId: string, kind: 'device' | 'wound') => void;
  onViewRecord: () => void;
  onAddAssessment: () => void;
  onViewDeviceAssessment: (assessment: DeviceAssessment) => void;
  onViewWoundAssessment: (assessment: Assessment) => void;
}

export const AvatarRecordsList: React.FC<AvatarRecordsListProps> = ({
  markers,
  selectedRecordId,
  selectedRecordType,
  currentAssessments,
  currentAssessmentCount,
  loadingAssessments,
  onRecordSelect,
  onViewRecord,
  onAddAssessment,
  onViewDeviceAssessment,
  onViewWoundAssessment,
}) => {
  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Records</h3>
        <p className="text-xs text-gray-600 mt-1">
          Select a record to view or add assessment
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {markers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No records yet</p>
            <p className="text-xs mt-1">Click the body to add devices or wounds</p>
          </div>
        ) : (
          <>
            {/* Devices */}
            {markers.filter(m => m.kind === 'device').length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Devices ({markers.filter(m => m.kind === 'device').length})
                </h4>
                <div className="space-y-2">
                  {markers.filter(m => m.kind === 'device').map(marker => (
                    <div key={marker.id} className="space-y-2">
                      <button
                        onClick={() => onRecordSelect(marker.id, 'device')}
                        className={`w-full text-left p-3 border rounded-lg transition-all ${
                          selectedRecordId === marker.id
                            ? 'bg-green-100 border-green-400 shadow-md'
                            : 'bg-green-50 hover:bg-green-100 border-green-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {marker.device?.type ? DEVICE_TYPE_LABELS[marker.device.type] : 'Device'}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {marker.regionKey.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </p>
                            {marker.device?.inserted_by && (
                              <p className="text-xs text-gray-500 mt-1">By: {marker.device.inserted_by}</p>
                            )}
                          </div>
                          <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                        </div>
                      </button>

                      {selectedRecordId === marker.id && (
                        <div className="ml-3 flex gap-2 animate-fadeIn">
                          <button
                            onClick={onViewRecord}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border-2 border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                          >
                            <FileText className="w-4 h-4" />
                            View Record
                          </button>
                          <button
                            onClick={onAddAssessment}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                          >
                            <Plus className="w-4 h-4" />
                            Add Assessment
                          </button>
                        </div>
                      )}

                      {selectedRecordId === marker.id && currentAssessmentCount > 0 && selectedRecordType === 'device' && (
                        <div className="ml-3 mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <h5 className="text-xs font-semibold text-gray-700 mb-2">
                            Assessment History ({currentAssessmentCount})
                          </h5>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {currentAssessments.map((assessment) => (
                              <button
                                key={assessment.id}
                                onClick={() => onViewDeviceAssessment(assessment as DeviceAssessment)}
                                className="w-full text-left text-xs text-gray-600 border-l-2 border-purple-400 pl-2 hover:bg-purple-50 rounded transition-colors p-1"
                              >
                                <div className="font-medium">{assessment.student_name}</div>
                                <div className="text-gray-500">{new Date(assessment.assessed_at).toLocaleString()}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedRecordId === marker.id && !loadingAssessments && currentAssessmentCount === 0 && selectedRecordType === 'device' && (
                        <div className="ml-3 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                          <p className="text-xs text-blue-700">
                            No assessments recorded yet. Click 'Add Assessment' above to document your first assessment.
                          </p>
                        </div>
                      )}

                      {selectedRecordId === marker.id && loadingAssessments && (
                        <div className="ml-3 mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                          <div className="text-xs text-gray-500">Loading assessments...</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wounds */}
            {markers.filter(m => m.kind === 'wound').length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Wounds ({markers.filter(m => m.kind === 'wound').length})
                </h4>
                <div className="space-y-2">
                  {markers.filter(m => m.kind === 'wound').map(marker => (
                    <div key={marker.id} className="space-y-2">
                      <button
                        onClick={() => onRecordSelect(marker.id, 'wound')}
                        className={`w-full text-left p-3 border rounded-lg transition-all ${
                          selectedRecordId === marker.id
                            ? 'bg-pink-100 border-pink-400 shadow-md'
                            : 'bg-pink-50 hover:bg-pink-100 border-pink-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {marker.wound?.wound_type ? WOUND_TYPE_LABELS[marker.wound.wound_type] : 'Wound'}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {marker.regionKey.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </p>
                            {marker.wound?.entered_by && (
                              <p className="text-xs text-gray-500 mt-1">By: {marker.wound.entered_by}</p>
                            )}
                          </div>
                          <div className="w-3 h-3 rounded-full bg-pink-500 border-2 border-white shadow-sm"></div>
                        </div>
                      </button>

                      {selectedRecordId === marker.id && (
                        <div className="ml-3 flex gap-2 animate-fadeIn">
                          <button
                            onClick={onViewRecord}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border-2 border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                          >
                            <FileText className="w-4 h-4" />
                            View Record
                          </button>
                          <button
                            onClick={onAddAssessment}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                          >
                            <Plus className="w-4 h-4" />
                            Add Assessment
                          </button>
                        </div>
                      )}

                      {selectedRecordId === marker.id && currentAssessmentCount > 0 && selectedRecordType === 'wound' && (
                        <div className="ml-3 mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <h5 className="text-xs font-semibold text-gray-700 mb-2">
                            Assessment History ({currentAssessmentCount})
                          </h5>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {currentAssessments.map((assessment) => (
                              <button
                                key={assessment.id}
                                onClick={() => onViewWoundAssessment(assessment as Assessment)}
                                className="w-full text-left text-xs text-gray-600 border-l-2 border-purple-400 pl-2 hover:bg-purple-50 rounded transition-colors p-1"
                              >
                                <div className="font-medium">{assessment.student_name}</div>
                                <div className="text-gray-500">{new Date(assessment.assessed_at).toLocaleString()}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedRecordId === marker.id && !loadingAssessments && currentAssessmentCount === 0 && selectedRecordType === 'wound' && (
                        <div className="ml-3 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                          <p className="text-xs text-blue-700">
                            No assessments recorded yet. Click 'Add Assessment' above to document your first assessment.
                          </p>
                        </div>
                      )}

                      {selectedRecordId === marker.id && loadingAssessments && (
                        <div className="ml-3 mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                          <div className="text-xs text-gray-500">Loading assessments...</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
