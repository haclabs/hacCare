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
import {
  createAvatarLocation,
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
import type {
  MarkerWithDetails,
  Coordinates,
  RegionKey,
  Device,
  Wound,
  CreateDeviceInput,
  UpdateDeviceInput,
  CreateWoundInput,
  UpdateWoundInput
} from '../../types/hacmap';
import { AlertCircle, Filter, X } from 'lucide-react';

interface AvatarBoardProps {
  patientId: string;
  patientName: string;
  patientNumber: string;
}

type PanelMode = 'create-device' | 'create-wound' | 'edit-device' | 'edit-wound' | null;

export const AvatarBoard: React.FC<AvatarBoardProps> = ({ patientId, patientName, patientNumber }) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [mode, setMode] = useState<'device' | 'wound'>('device');
  const [markers, setMarkers] = useState<MarkerWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Panel state
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedWound, setSelectedWound] = useState<Wound | null>(null);
  
  // Filters
  const [showDevices, setShowDevices] = useState(true);
  const [showWounds, setShowWounds] = useState(true);

  const tenantId = currentTenant?.id;

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
        created_by: user.id
      });

      setSelectedLocationId(location.id);
      setPanelMode(mode === 'device' ? 'create-device' : 'create-wound');
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
          MRN: {patientNumber} • Click the body to add {mode === 'device' ? 'devices' : 'wounds/incisions'}
        </p>
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
              mode={mode}
              markers={filteredMarkers}
              onCreateAt={handleCreateAt}
              onMarkerClick={handleMarkerClick}
              className=""
            />
            
            {/* Right sidebar with buttons and info */}
            <div className="flex flex-col space-y-4 w-80 flex-shrink-0">
              {/* Quick Add Buttons */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Quick Add</div>
                <div className="space-y-2">
                  <button
                    onClick={() => setMode('device')}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                      mode === 'device'
                        ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                        : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="7" y="2" width="2" height="12" rx="1" />
                      <rect x="2" y="7" width="12" height="2" rx="1" />
                    </svg>
                    <span>Add Device</span>
                  </button>
                  <button
                    onClick={() => setMode('wound')}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                      mode === 'wound'
                        ? 'bg-pink-500 text-white shadow-md hover:bg-pink-600'
                        : 'bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-current"></div>
                    <span>Add Wound</span>
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
                            {marker.kind === 'device' ? marker.device?.type : marker.wound?.wound_type}
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
                  Click a marker on the body to edit
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
                            <button
                              key={marker.id}
                              onClick={() => handleMarkerClick(marker.id, 'device')}
                              className="w-full text-left p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {marker.device?.type?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Device'}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {marker.regionKey.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                  </p>
                                </div>
                                <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                              </div>
                            </button>
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
                            <button
                              key={marker.id}
                              onClick={() => handleMarkerClick(marker.id, 'wound')}
                              className="w-full text-left p-3 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-lg transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {marker.wound?.wound_type?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Wound'}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {marker.regionKey.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                  </p>
                                </div>
                                <div className="w-3 h-3 rounded-full bg-pink-500 border-2 border-white shadow-sm"></div>
                              </div>
                            </button>
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
    </div>
  );
};
