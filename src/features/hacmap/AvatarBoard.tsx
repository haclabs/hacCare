import React from 'react';
import { AlertCircle, Filter, X } from 'lucide-react';
import { PatientActionBar } from '../../components/PatientActionBar';
import { AvatarCanvasPanel } from './components/AvatarCanvasPanel';
import { AvatarRecordsList } from './components/AvatarRecordsList';
import { DeviceForm } from './forms/DeviceForm';
import { WoundForm } from './forms/WoundForm';
import { AssessmentForm } from './forms/AssessmentForm';
import { DeviceAssessmentForm } from './forms/DeviceAssessmentForm';
import { DeviceAssessmentViewer } from './components/DeviceAssessmentViewer';
import { WoundAssessmentViewer } from './components/WoundAssessmentViewer';
import { useAvatarBoard } from './hooks/useAvatarBoard';

interface AvatarBoardProps {
  patientId: string;
  patientName: string;
  patientNumber: string;
  onChartClick?: () => void;
  onVitalsClick?: () => void;
  onMedsClick?: () => void;
  onLabsClick?: () => void;
  onOrdersClick?: () => void;
  onHacMapClick?: () => void;
  onIOClick?: () => void;
  onNotesClick?: () => void;
  vitalsCount?: number;
  medsCount?: number;
  hasNewLabs?: boolean;
  hasNewOrders?: boolean;
  hasNewNotes?: boolean;
}

export const AvatarBoard: React.FC<AvatarBoardProps> = ({
  patientId,
  patientName,
  patientNumber,
  onChartClick,
  onVitalsClick,
  onMedsClick,
  onLabsClick,
  onOrdersClick,
  onHacMapClick,
  onIOClick,
  onNotesClick,
  vitalsCount = 0,
  medsCount = 0,
  hasNewLabs = false,
  hasNewOrders = false,
  hasNewNotes = false
}) => {
  const {
    placementMode, setPlacementMode,
    markers,
    loading,
    error,
    pendingMarker,
    panelMode,
    selectedLocationId,
    selectedDevice,
    selectedWound,
    selectedRecordId,
    selectedRecordType,
    currentAssessments,
    currentAssessmentCount,
    loadingAssessments,
    showAssessmentModal, setShowAssessmentModal,
    selectedDeviceAssessment, setSelectedDeviceAssessment,
    selectedWoundAssessment, setSelectedWoundAssessment,
    showViewAssessmentModal, setShowViewAssessmentModal,
    showDevices, setShowDevices,
    showWounds, setShowWounds,
    filteredMarkers,
    tenantId,
    handleCreateAt,
    handleMarkerClick,
    handleMarkerMove,
    handleSaveDevice,
    handleDeleteDevice,
    handleSaveWound,
    handleDeleteWound,
    handleClosePanel,
    handleRecordSelect,
    handleViewRecord,
    handleAddAssessment,
    handleSaveAssessment,
    handleSaveDeviceAssessment,
    handleViewDeviceAssessment,
    handleViewWoundAssessment,
  } = useAvatarBoard(patientId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-3 text-red-600">
          <AlertCircle className="h-6 w-6" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <PatientActionBar
        onChartClick={onChartClick}
        onVitalsClick={onVitalsClick}
        onMedsClick={onMedsClick}
        onLabsClick={onLabsClick}
        onOrdersClick={onOrdersClick}
        onHacMapClick={onHacMapClick}
        onIOClick={onIOClick}
        onNotesClick={onNotesClick}
        vitalsCount={vitalsCount}
        medsCount={medsCount}
        hasNewLabs={hasNewLabs}
        hasNewOrders={hasNewOrders}
        hasNewNotes={hasNewNotes}
        activeAction="hacmap"
      />

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{patientName}</h2>
        <p className="text-sm text-gray-600 mt-1">
          MRN: {patientNumber}
          {placementMode
            ? ` • Click the body to add ${placementMode === 'device' ? 'devices' : 'wounds/incisions'}`
            : ' • Click a marker to edit or select Add Device/Wound below'}
        </p>
      </div>

      {/* Quick Start Guide */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">?</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Start Guide</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { step: '1', title: 'Select Type', desc: 'Click "Add Device" or "Add Wound" button below' },
                { step: '2', title: 'Place Marker', desc: 'Click on the body avatar where item is located' },
                { step: '3', title: 'Fill Form', desc: 'Complete details in the form panel and save' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{step}</div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">{title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">Show:</span>
        <button
          onClick={() => setShowDevices(!showDevices)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
            showDevices
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-gray-100 text-gray-500 border border-gray-300'
          }`}
        >
          Devices ({markers.filter(m => m.kind === 'device').length})
        </button>
        <button
          onClick={() => setShowWounds(!showWounds)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
            showWounds
              ? 'bg-pink-100 text-pink-700 border border-pink-300'
              : 'bg-gray-100 text-gray-500 border border-gray-300'
          }`}
        >
          Wounds ({markers.filter(m => m.kind === 'wound').length})
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        <AvatarCanvasPanel
          markers={markers}
          filteredMarkers={filteredMarkers}
          placementMode={placementMode}
          setPlacementMode={setPlacementMode}
          pendingMarker={pendingMarker}
          onCreateAt={handleCreateAt}
          onMarkerClick={handleMarkerClick}
          onMarkerMove={handleMarkerMove}
        />

        {/* Right: Records List or Form */}
        <div className="w-[28rem] bg-white rounded-lg border-2 border-gray-200 flex flex-col overflow-hidden">
          {panelMode !== null ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">
                  {panelMode === 'create-device' ? 'Add Device' :
                   panelMode === 'edit-device' ? 'Edit Device' :
                   panelMode === 'create-wound' ? 'Add Wound/Incision' :
                   'Edit Wound/Incision'}
                </h3>
                <button
                  onClick={handleClosePanel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {(panelMode === 'create-device' || panelMode === 'edit-device') &&
                  (panelMode === 'create-device' ? pendingMarker : selectedLocationId) && (
                  <DeviceForm
                    device={selectedDevice || undefined}
                    locationId={selectedLocationId || 'pending'}
                    onSave={handleSaveDevice}
                    onDelete={panelMode === 'edit-device' ? handleDeleteDevice : undefined}
                    onCancel={handleClosePanel}
                  />
                )}
                {(panelMode === 'create-wound' || panelMode === 'edit-wound') &&
                  (panelMode === 'create-wound' ? pendingMarker : selectedLocationId) && (
                  <WoundForm
                    wound={selectedWound || undefined}
                    locationId={selectedLocationId || 'pending'}
                    onSave={handleSaveWound}
                    onDelete={panelMode === 'edit-wound' ? handleDeleteWound : undefined}
                    onCancel={handleClosePanel}
                  />
                )}
              </div>
            </>
          ) : (
            <AvatarRecordsList
              markers={markers}
              selectedRecordId={selectedRecordId}
              selectedRecordType={selectedRecordType}
              currentAssessments={currentAssessments}
              currentAssessmentCount={currentAssessmentCount}
              loadingAssessments={loadingAssessments}
              onRecordSelect={handleRecordSelect}
              onViewRecord={handleViewRecord}
              onAddAssessment={handleAddAssessment}
              onViewDeviceAssessment={handleViewDeviceAssessment}
              onViewWoundAssessment={handleViewWoundAssessment}
            />
          )}
        </div>
      </div>

      {/* Assessment Modal */}
      {showAssessmentModal && selectedRecordId && selectedRecordType && tenantId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Assessment - {selectedRecordType === 'device' ? 'Device' : 'Wound'}
              </h3>
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selectedRecordType === 'device' && selectedDevice ? (
                <DeviceAssessmentForm
                  device={selectedDevice}
                  patientId={patientId}
                  tenantId={tenantId}
                  onSave={handleSaveDeviceAssessment}
                  onCancel={() => setShowAssessmentModal(false)}
                />
              ) : (
                <AssessmentForm
                  recordType={selectedRecordType}
                  recordId={selectedRecordId}
                  patientId={patientId}
                  tenantId={tenantId}
                  onSave={handleSaveAssessment}
                  onCancel={() => setShowAssessmentModal(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Assessment Modal */}
      {showViewAssessmentModal && (selectedWoundAssessment || selectedDeviceAssessment) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-purple-50">
              <h3 className="text-lg font-semibold text-gray-900">Assessment Details</h3>
              <button
                onClick={() => {
                  setShowViewAssessmentModal(false);
                  setSelectedWoundAssessment(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selectedDeviceAssessment ? (
                <DeviceAssessmentViewer
                  assessment={selectedDeviceAssessment}
                  device={selectedDevice || undefined}
                />
              ) : selectedWoundAssessment ? (
                <WoundAssessmentViewer assessment={selectedWoundAssessment} />
              ) : null}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowViewAssessmentModal(false);
                  setSelectedWoundAssessment(null);
                  setSelectedDeviceAssessment(null);
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
