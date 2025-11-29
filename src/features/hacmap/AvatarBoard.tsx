/**
 * Avatar Board - Main orchestrator for hacMap Device & Wound Mapping
 * Coordinates avatar canvas, mode toggle, and forms
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';
import { AvatarCanvas } from './components/AvatarCanvas';
import { DeviceForm } from './forms/DeviceForm';
import { WoundForm } from './forms/WoundForm';
import { AssessmentForm } from './forms/AssessmentForm';
import { DeviceAssessmentForm } from './forms/DeviceAssessmentForm';
import { DeviceAssessmentViewer } from './components/DeviceAssessmentViewer';
import {
  createAvatarLocation,
  updateAvatarLocation,
  listMarkers,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  getWound,
  createWound,
  updateWound,
  deleteWound
} from './api';
import {
  getWoundAssessments,
  createAssessment
} from '../../services/hacmap/assessmentService';
import {
  getDeviceAssessments as getDeviceAssessmentsList,
  createDeviceAssessment
} from '../../services/hacmap/deviceAssessmentService';
import type {
  MarkerWithDetails,
  Coordinates,
  RegionKey,
  Device,
  Wound,
  Assessment,
  DeviceAssessment,
  CreateDeviceInput,
  UpdateDeviceInput,
  CreateWoundInput,
  UpdateWoundInput,
  CreateAssessmentInput,
  CreateDeviceAssessmentInput
} from '../../types/hacmap';
import { DEVICE_TYPE_LABELS, WOUND_TYPE_LABELS } from '../../types/hacmap';
import { AlertCircle, Filter, X, FileText, Plus } from 'lucide-react';

interface AvatarBoardProps {
  patientId: string;
  patientName: string;
  patientNumber: string;
}

type PanelMode = 'create-device' | 'create-wound' | 'edit-device' | 'edit-wound' | null;
type PlacementMode = 'device' | 'wound' | null;

export const AvatarBoard: React.FC<AvatarBoardProps> = ({ patientId, patientName, patientNumber }) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [placementMode, setPlacementMode] = useState<PlacementMode>(null);
  const [markers, setMarkers] = useState<MarkerWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Panel state
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedWound, setSelectedWound] = useState<Wound | null>(null);
  
  // Record selection for assessments
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecordType, setSelectedRecordType] = useState<'device' | 'wound' | null>(null);
  const [deviceAssessments, setDeviceAssessments] = useState<DeviceAssessment[]>([]);
  const [woundAssessments, setWoundAssessments] = useState<Assessment[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [selectedDeviceAssessment, setSelectedDeviceAssessment] = useState<DeviceAssessment | null>(null);
  const [selectedWoundAssessment, setSelectedWoundAssessment] = useState<Assessment | null>(null);
  const [showViewAssessmentModal, setShowViewAssessmentModal] = useState(false);
  
  // Filters
  const [showDevices, setShowDevices] = useState(true);
  const [showWounds, setShowWounds] = useState(true);

  const tenantId = currentTenant?.id;

  // Get current assessments based on record type
  const currentAssessments = selectedRecordType === 'device' ? deviceAssessments : woundAssessments;
  const currentAssessmentCount = currentAssessments.length;

  // Load markers on mount
  useEffect(() => {
    if (patientId) {
      loadMarkers();
    }
  }, [patientId]);

  const loadMarkers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listMarkers(patientId);
      setMarkers(data);
    } catch (err: any) {
      console.error('Error loading markers:', err);
      
      // Check if it's a "table doesn't exist" error
      if (err?.message?.includes('does not exist') || err?.code === '42P01') {
        setError('Database tables not found. Please run the hacmap_tables.sql migration first.');
      } else {
        setError('Failed to load markers. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle avatar click - create new location
  const handleCreateAt = async (regionKey: RegionKey, coords: Coordinates) => {
    if (!user?.id || !tenantId) {
      alert('Authentication error. Please log in again.');
      return;
    }

    try {
      const location = await createAvatarLocation({
        tenant_id: tenantId,
        patient_id: patientId,
        region_key: regionKey,
        x_percent: coords.x,
        y_percent: coords.y,
        body_view: coords.view, // Track which view marker was placed on
        created_by: user.id
      });

      setSelectedLocationId(location.id);
      setPanelMode(placementMode === 'device' ? 'create-device' : 'create-wound');
      setPlacementMode(null); // Exit placement mode after creating
    } catch (err) {
      console.error('Error creating location:', err);
      alert('Failed to create location. Please try again.');
    }
  };

  // Handle marker click - edit existing
  const handleMarkerClick = async (id: string, kind: 'device' | 'wound') => {
    try {
      if (kind === 'device') {
        const device = await getDevice(id);
        setSelectedDevice(device);
        setSelectedLocationId(device.location_id);
        setPanelMode('edit-device');
      } else {
        const wound = await getWound(id);
        setSelectedWound(wound);
        setSelectedLocationId(wound.location_id);
        setPanelMode('edit-wound');
      }
    } catch (err) {
      console.error('Error loading item:', err);
      alert('Failed to load item. Please try again.');
    }
  };

  // Handle marker drag/move
  const handleMarkerMove = async (id: string, regionKey: RegionKey, coords: Coordinates) => {
    try {
      // Find the marker to get its location_id
      const marker = markers.find(m => m.id === id);
      if (!marker?.location?.id) return;

      // Update the location in database
      await updateAvatarLocation(marker.location.id, {
        x_percent: coords.x,
        y_percent: coords.y,
        region_key: regionKey
      });

      // Optimistically update local state
      setMarkers(prevMarkers =>
        prevMarkers.map(m =>
          m.id === id
            ? { ...m, x: coords.x, y: coords.y, regionKey: regionKey }
            : m
        )
      );
    } catch (err) {
      console.error('Error moving marker:', err);
      // Reload to revert on error
      await loadMarkers();
    }
  };

  // Device handlers
  const handleSaveDevice = async (data: CreateDeviceInput | UpdateDeviceInput) => {
    if (!user?.id || !tenantId) {
      alert('Authentication error. Please log in again.');
      return;
    }

    try {
      if (panelMode === 'create-device') {
        await createDevice({
          ...data as CreateDeviceInput,
          tenant_id: tenantId,
          patient_id: patientId,
          created_by: user.id
        });
      } else if (selectedDevice) {
        await updateDevice(selectedDevice.id, data as UpdateDeviceInput);
      }
      
      await loadMarkers();
      handleClosePanel();
    } catch (err) {
      console.error('Error saving device:', err);
      throw err;
    }
  };

  const handleDeleteDevice = async () => {
    if (!selectedDevice) return;
    
    try {
      await deleteDevice(selectedDevice.id);
      await loadMarkers();
      handleClosePanel();
    } catch (err) {
      console.error('Error deleting device:', err);
      throw err;
    }
  };

  // Wound handlers
  const handleSaveWound = async (data: CreateWoundInput | UpdateWoundInput) => {
    if (!user?.id || !tenantId) {
      alert('Authentication error. Please log in again.');
      return;
    }

    try {
      if (panelMode === 'create-wound') {
        await createWound({
          ...data as CreateWoundInput,
          tenant_id: tenantId,
          patient_id: patientId,
          created_by: user.id
        });
      } else if (selectedWound) {
        await updateWound(selectedWound.id, data as UpdateWoundInput);
      }
      
      await loadMarkers();
      handleClosePanel();
    } catch (err) {
      console.error('Error saving wound:', err);
      throw err;
    }
  };

  const handleDeleteWound = async () => {
    if (!selectedWound) return;
    
    try {
      await deleteWound(selectedWound.id);
      await loadMarkers();
      handleClosePanel();
    } catch (err) {
      console.error('Error deleting wound:', err);
      throw err;
    }
  };

  const handleClosePanel = () => {
    setPanelMode(null);
    setSelectedLocationId(null);
    setSelectedDevice(null);
    setSelectedWound(null);
    setSelectedRecordId(null);
    setSelectedRecordType(null);
    setDeviceAssessments([]);
    setWoundAssessments([]);
  };

  // Handle record selection for assessment
  const handleRecordSelect = async (markerId: string, kind: 'device' | 'wound') => {
    if (!tenantId) return;

    // If clicking the same record, deselect it
    if (selectedRecordId === markerId) {
      setSelectedRecordId(null);
      setSelectedRecordType(null);
      setDeviceAssessments([]);
      setWoundAssessments([]);
      return;
    }

    setSelectedRecordId(markerId);
    setSelectedRecordType(kind);
    setLoadingAssessments(true);

    try {
      // Load assessment history for this record
      if (kind === 'device') {
        const data = await getDeviceAssessmentsList(markerId, tenantId);
        setDeviceAssessments(data);
        setWoundAssessments([]);
      } else {
        const data = await getWoundAssessments(markerId, tenantId);
        setWoundAssessments(data);
        setDeviceAssessments([]);
      }
    } catch (err) {
      console.error('Error loading assessments:', err);
      setDeviceAssessments([]);
      setWoundAssessments([]);
    } finally {
      setLoadingAssessments(false);
    }
  };

  // Handle View Record button
  const handleViewRecord = () => {
    if (!selectedRecordId || !selectedRecordType) return;
    
    const marker = markers.find(m => m.id === selectedRecordId);
    if (!marker) return;

    // Open the edit form for viewing
    handleMarkerClick(selectedRecordId, selectedRecordType);
  };

  // Handle Add Assessment button
  const handleAddAssessment = async () => {
    if (!selectedRecordId || !selectedRecordType) return;
    
    // Load device data if assessing a device
    if (selectedRecordType === 'device') {
      try {
        const device = await getDevice(selectedRecordId);
        setSelectedDevice(device);
      } catch (err) {
        console.error('Error loading device:', err);
        alert('Failed to load device information.');
        return;
      }
    }
    
    setShowAssessmentModal(true);
  };

  // Handle Save Assessment (Wound)
  const handleSaveAssessment = async (data: CreateAssessmentInput) => {
    try {
      if (selectedRecordType === 'wound') {
        await createAssessment(data);
      }
      setShowAssessmentModal(false);
      
      // Reload assessments
      if (selectedRecordId && selectedRecordType && tenantId) {
        const data = await getWoundAssessments(selectedRecordId, tenantId);
        setWoundAssessments(data);
      }
    } catch (err) {
      console.error('Error saving wound assessment:', err);
      throw err;
    }
  };

  // Handle Save Device Assessment
  const handleSaveDeviceAssessment = async (data: CreateDeviceAssessmentInput) => {
    try {
      await createDeviceAssessment(data);
      setShowAssessmentModal(false);
      
      // Reload device assessments
      if (selectedRecordId && tenantId) {
        const data = await getDeviceAssessmentsList(selectedRecordId, tenantId);
        setDeviceAssessments(data);
      }
    } catch (err) {
      console.error('Error saving device assessment:', err);
      throw err;
    }
  };

  // Handle View Device Assessment
  const handleViewDeviceAssessment = (assessment: DeviceAssessment) => {
    setSelectedDeviceAssessment(assessment);
    setShowViewAssessmentModal(true);
  };

  // Handle View Wound Assessment
  const handleViewWoundAssessment = (assessment: Assessment) => {
    setSelectedWoundAssessment(assessment);
    setShowViewAssessmentModal(true);
  };

  // Filter markers based on toggles
  const filteredMarkers = markers.filter(marker => {
    if (marker.kind === 'device' && !showDevices) return false;
    if (marker.kind === 'wound' && !showWounds) return false;
    return true;
  });

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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {patientName}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          MRN: {patientNumber}
          {placementMode ? ` • Click the body to add ${placementMode === 'device' ? 'devices' : 'wounds/incisions'}` : ' • Click a marker to edit or select Add Device/Wound below'}
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
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Select Type</p>
                  <p className="text-xs text-gray-600 mt-0.5">Click "Add Device" or "Add Wound" button below</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Place Marker</p>
                  <p className="text-xs text-gray-600 mt-0.5">Click on the body avatar where item is located</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Fill Form</p>
                  <p className="text-xs text-gray-600 mt-0.5">Complete details in the form panel and save</p>
                </div>
              </div>
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

      {/* Main Content - Side by Side Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Avatar Canvas with integrated controls */}
        <div className="flex-1 bg-gray-50 rounded-lg border-2 border-gray-200 p-6 overflow-auto">
          <div className="flex items-start gap-10 justify-center">
            {/* Avatar */}
            <AvatarCanvas
              mode={placementMode}
              markers={filteredMarkers}
              onCreateAt={placementMode ? handleCreateAt : undefined}
              onMarkerClick={handleMarkerClick}
              onMarkerMove={handleMarkerMove}
              className=""
            />
            
            {/* Right sidebar with buttons and info */}
            <div className="flex flex-col space-y-4 w-80 flex-shrink-0">
              {/* Quick Add Buttons */}
              <div className={`rounded-xl shadow-lg border-2 p-4 transition-all ${
                placementMode 
                  ? (placementMode === 'device' ? 'bg-green-50 border-green-400' : 'bg-pink-50 border-pink-400')
                  : 'bg-white border-gray-200'
              }`}>
                <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Quick Add</div>
                
                {/* Active Mode Indicator */}
                {placementMode && (
                  <div className={`mb-3 p-3 rounded-lg border-2 ${
                    placementMode === 'device' 
                      ? 'bg-green-100 border-green-400 animate-pulse'
                      : 'bg-pink-100 border-pink-400 animate-pulse'
                  }`}>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <div className={`w-3 h-3 rounded-full ${
                        placementMode === 'device' ? 'bg-green-600' : 'bg-pink-600'
                      } animate-ping absolute`}></div>
                      <div className={`w-3 h-3 rounded-full ${
                        placementMode === 'device' ? 'bg-green-600' : 'bg-pink-600'
                      }`}></div>
                      <span className={placementMode === 'device' ? 'text-green-900' : 'text-pink-900'}>
                        ACTIVE: Click body to place {placementMode}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <button
                    onClick={() => setPlacementMode(placementMode === 'device' ? null : 'device')}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                      placementMode === 'device'
                        ? 'bg-green-600 text-white shadow-lg hover:bg-green-700 ring-4 ring-green-200'
                        : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="7" y="2" width="2" height="12" rx="1" />
                      <rect x="2" y="7" width="12" height="2" rx="1" />
                    </svg>
                    <span>{placementMode === 'device' ? '✓ Device Mode Active - Click to Cancel' : 'Add Device'}</span>
                  </button>
                  <button
                    onClick={() => setPlacementMode(placementMode === 'wound' ? null : 'wound')}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                      placementMode === 'wound'
                        ? 'bg-pink-600 text-white shadow-lg hover:bg-pink-700 ring-4 ring-pink-200'
                        : 'bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-current"></div>
                    <span>{placementMode === 'wound' ? '✓ Wound Mode Active - Click to Cancel' : 'Add Wound'}</span>
                  </button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Summary</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Devices:</span>
                    <span className="font-semibold text-green-600">{markers.filter(m => m.kind === 'device').length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Wounds:</span>
                    <span className="font-semibold text-pink-600">{markers.filter(m => m.kind === 'wound').length}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Markers:</span>
                      <span className="font-semibold text-gray-900">{markers.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              {markers.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                  <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Recent</div>
                  <div className="space-y-2">
                    {markers.slice(-3).reverse().map(marker => (
                      <div 
                        key={marker.id}
                        className="text-xs p-2 bg-gray-50 rounded border border-gray-200"
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${marker.kind === 'device' ? 'bg-green-500' : 'bg-pink-500'}`}></div>
                          <span className="font-medium text-gray-700">
                            {marker.kind === 'device' 
                              ? (marker.device?.type ? DEVICE_TYPE_LABELS[marker.device.type] : marker.device?.type)
                              : (marker.wound?.wound_type ? WOUND_TYPE_LABELS[marker.wound.wound_type] : marker.wound?.wound_type)}
                          </span>
                        </div>
                        <div className="text-gray-500 ml-4 mt-1">
                          {marker.regionKey.replace(/-/g, ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Records List or Form */}
        <div className="w-[28rem] bg-white rounded-lg border-2 border-gray-200 flex flex-col overflow-hidden">
          {panelMode !== null ? (
            // Form View
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
                {(panelMode === 'create-device' || panelMode === 'edit-device') && selectedLocationId && (
                  <DeviceForm
                    device={selectedDevice || undefined}
                    locationId={selectedLocationId}
                    onSave={handleSaveDevice}
                    onDelete={panelMode === 'edit-device' ? handleDeleteDevice : undefined}
                    onCancel={handleClosePanel}
                  />
                )}
                
                {(panelMode === 'create-wound' || panelMode === 'edit-wound') && selectedLocationId && (
                  <WoundForm
                    wound={selectedWound || undefined}
                    locationId={selectedLocationId}
                    onSave={handleSaveWound}
                    onDelete={panelMode === 'edit-wound' ? handleDeleteWound : undefined}
                    onCancel={handleClosePanel}
                  />
                )}
              </div>
            </>
          ) : (
            // Records List View
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
                                onClick={() => handleRecordSelect(marker.id, 'device')}
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
                              
                              {/* Action Buttons */}
                              {selectedRecordId === marker.id && (
                                <div className="ml-3 flex gap-2 animate-fadeIn">
                                  <button
                                    onClick={handleViewRecord}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border-2 border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                                  >
                                    <FileText className="w-4 h-4" />
                                    View Record
                                  </button>
                                  <button
                                    onClick={handleAddAssessment}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Add Assessment
                                  </button>
                                </div>
                              )}
                              
                              {/* Assessment History */}
                              {selectedRecordId === marker.id && currentAssessmentCount > 0 && (
                                <div className="ml-3 mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                  <h5 className="text-xs font-semibold text-gray-700 mb-2">
                                    Assessment History ({currentAssessmentCount})
                                  </h5>
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {currentAssessments.map((assessment: DeviceAssessment | Assessment) => (
                                      <button
                                        key={assessment.id}
                                        onClick={() => selectedRecordType === 'device' ? handleViewDeviceAssessment(assessment as DeviceAssessment) : handleViewWoundAssessment(assessment as Assessment)}
                                        className="w-full text-left text-xs text-gray-600 border-l-2 border-purple-400 pl-2 hover:bg-purple-50 rounded transition-colors p-1"
                                      >
                                        <div className="font-medium">{assessment.student_name}</div>
                                        <div className="text-gray-500">{new Date(assessment.assessed_at).toLocaleString()}</div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* No Assessments Message */}
                              {selectedRecordId === marker.id && !loadingAssessments && currentAssessmentCount === 0 && (
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
                                onClick={() => handleRecordSelect(marker.id, 'wound')}
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
                              
                              {/* Action Buttons */}
                              {selectedRecordId === marker.id && (
                                <div className="ml-3 flex gap-2 animate-fadeIn">
                                  <button
                                    onClick={handleViewRecord}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border-2 border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                                  >
                                    <FileText className="w-4 h-4" />
                                    View Record
                                  </button>
                                  <button
                                    onClick={handleAddAssessment}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Add Assessment
                                  </button>
                                </div>
                              )}
                              
                              {/* Assessment History */}
                              {selectedRecordId === marker.id && currentAssessmentCount > 0 && (
                                <div className="ml-3 mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                  <h5 className="text-xs font-semibold text-gray-700 mb-2">
                                    Assessment History ({currentAssessmentCount})
                                  </h5>
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {currentAssessments.map((assessment: DeviceAssessment | Assessment) => (
                                      <button
                                        key={assessment.id}
                                        onClick={() => selectedRecordType === 'device' ? handleViewDeviceAssessment(assessment as DeviceAssessment) : handleViewWoundAssessment(assessment as Assessment)}
                                        className="w-full text-left text-xs text-gray-600 border-l-2 border-purple-400 pl-2 hover:bg-purple-50 rounded transition-colors p-1"
                                      >
                                        <div className="font-medium">{assessment.student_name}</div>
                                        <div className="text-gray-500">{new Date(assessment.assessed_at).toLocaleString()}</div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* No Assessments Message */}
                              {selectedRecordId === marker.id && !loadingAssessments && currentAssessmentCount === 0 && (
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
                  tenantId={tenantId || ''}
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
              <h3 className="text-lg font-semibold text-gray-900">
                Assessment Details
              </h3>
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
              <div className="space-y-6">
                {/* Header Info */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-900 mb-1">
                        Assessment Type
                      </label>
                      <p className="text-gray-900">
                        {selectedWoundAssessment.device_id ? 'Device Assessment' : 'Wound Assessment'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-900 mb-1">
                        Assessed By
                      </label>
                      <p className="text-gray-900">{selectedWoundAssessment.student_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-900 mb-1">
                        Assessment Date/Time
                      </label>
                      <p className="text-gray-900">
                        {new Date(selectedWoundAssessment.assessed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Common Fields */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedWoundAssessment.site_condition && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Site Condition
                      </label>
                      <p className="text-gray-900 capitalize">{selectedWoundAssessment.site_condition}</p>
                    </div>
                  )}
                  {selectedWoundAssessment.pain_level !== null && selectedWoundAssessment.pain_level !== undefined && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pain Level
                      </label>
                      <p className="text-gray-900">{selectedWoundAssessment.pain_level}/10</p>
                    </div>
                  )}
                </div>

                {/* Device-Specific Fields */}
                {selectedWoundAssessment.device_id && (
                  <div className="border-t pt-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Device Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedWoundAssessment.device_functioning !== null && selectedWoundAssessment.device_functioning !== undefined && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Device Functioning
                          </label>
                          <p className="text-gray-900">
                            {selectedWoundAssessment.device_functioning ? 'Yes' : 'No'}
                          </p>
                        </div>
                      )}
                      {selectedWoundAssessment.output_amount_ml && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Output Amount
                          </label>
                          <p className="text-gray-900">{selectedWoundAssessment.output_amount_ml} mL</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Wound-Specific Fields */}
                {selectedWoundAssessment.wound_id && (
                  <div className="border-t pt-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Wound Details</h4>
                    <div className="space-y-4">
                      {/* Dimensions */}
                      {(selectedWoundAssessment.wound_length_cm || selectedWoundAssessment.wound_width_cm || selectedWoundAssessment.wound_depth_cm) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dimensions
                          </label>
                          <p className="text-gray-900">
                            L: {selectedWoundAssessment.wound_length_cm || '-'} cm × 
                            W: {selectedWoundAssessment.wound_width_cm || '-'} cm × 
                            D: {selectedWoundAssessment.wound_depth_cm || '-'} cm
                          </p>
                        </div>
                      )}
                      
                      {selectedWoundAssessment.wound_appearance && selectedWoundAssessment.wound_appearance.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Wound Appearance
                          </label>
                          <p className="text-gray-900 capitalize">
                            {selectedWoundAssessment.wound_appearance.join(', ')}
                          </p>
                        </div>
                      )}

                      {selectedWoundAssessment.surrounding_skin && selectedWoundAssessment.surrounding_skin.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Surrounding Skin
                          </label>
                          <p className="text-gray-900 capitalize">
                            {selectedWoundAssessment.surrounding_skin.map(s => 
                              s === 'erythema' ? 'Erythema (Redness)' :
                              s === 'edema' ? 'Edema (Swelling)' :
                              s.charAt(0).toUpperCase() + s.slice(1)
                            ).join(', ')}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        {selectedWoundAssessment.drainage_amount && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Drainage Amount
                            </label>
                            <p className="text-gray-900 capitalize">{selectedWoundAssessment.drainage_amount}</p>
                          </div>
                        )}
                        {selectedWoundAssessment.drainage_type && selectedWoundAssessment.drainage_type.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Drainage Type
                            </label>
                            <p className="text-gray-900 capitalize">
                              {selectedWoundAssessment.drainage_type.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {selectedWoundAssessment.treatment_applied && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Treatment Applied
                            </label>
                            <p className="text-gray-900">{selectedWoundAssessment.treatment_applied}</p>
                          </div>
                        )}
                        {selectedWoundAssessment.dressing_type && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Dressing Type
                            </label>
                            <p className="text-gray-900">{selectedWoundAssessment.dressing_type}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedWoundAssessment.notes && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedWoundAssessment.notes}</p>
                  </div>
                )}
              </div>
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
