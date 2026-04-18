import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext';
import { systemLogger } from '../../../services/monitoring/systemLogger';
import {
  createAvatarLocation, updateAvatarLocation, listMarkers,
  getDevice, createDevice, updateDevice, deleteDevice,
  getWound, createWound, updateWound, deleteWound
} from '../api';
import { getWoundAssessments, createAssessment } from '../../../services/hacmap/assessmentService';
import { getDeviceAssessments as getDeviceAssessmentsList, createDeviceAssessment } from '../../../services/hacmap/deviceAssessmentService';
import type {
  MarkerWithDetails, Coordinates, RegionKey, Device, Wound, Assessment, DeviceAssessment,
  CreateDeviceInput, UpdateDeviceInput, CreateWoundInput, UpdateWoundInput,
  CreateAssessmentInput, CreateDeviceAssessmentInput
} from '../../../types/hacmap';
import { secureLogger } from '../../../lib/security/secureLogger';

export type PanelMode = 'create-device' | 'create-wound' | 'edit-device' | 'edit-wound' | null;
export type PlacementMode = 'device' | 'wound' | null;

export interface PendingMarker {
  kind: 'device' | 'wound';
  regionKey: RegionKey;
  x: number;
  y: number;
  view: string;
}

export function useAvatarBoard(patientId: string) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  const [placementMode, setPlacementMode] = useState<PlacementMode>(null);
  const [markers, setMarkers] = useState<MarkerWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingMarker, setPendingMarker] = useState<PendingMarker | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedWound, setSelectedWound] = useState<Wound | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecordType, setSelectedRecordType] = useState<'device' | 'wound' | null>(null);
  const [deviceAssessments, setDeviceAssessments] = useState<DeviceAssessment[]>([]);
  const [woundAssessments, setWoundAssessments] = useState<Assessment[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [selectedDeviceAssessment, setSelectedDeviceAssessment] = useState<DeviceAssessment | null>(null);
  const [selectedWoundAssessment, setSelectedWoundAssessment] = useState<Assessment | null>(null);
  const [showViewAssessmentModal, setShowViewAssessmentModal] = useState(false);
  const [showDevices, setShowDevices] = useState(true);
  const [showWounds, setShowWounds] = useState(true);

  const currentAssessments = selectedRecordType === 'device' ? deviceAssessments : woundAssessments;
  const currentAssessmentCount = currentAssessments.length;

  const loadMarkers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listMarkers(patientId);
      setMarkers(data);
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };
      secureLogger.error('Error loading markers:', error);

      if (error?.message?.includes('does not exist') || error?.code === '42P01') {
        setError('Database tables not found. Please run the hacmap_tables.sql migration first.');
      } else {
        setError('Failed to load markers. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) {
      loadMarkers();
    }
  }, [patientId, loadMarkers]);

  const handleCreateAt = async (regionKey: RegionKey, coords: Coordinates) => {
    if (!user?.id || !tenantId) {
      alert('Authentication error. Please log in again.');
      return;
    }

    setPendingMarker({
      kind: placementMode as 'device' | 'wound',
      regionKey,
      x: coords.x,
      y: coords.y,
      view: coords.view || 'front'
    });

    setPanelMode(placementMode === 'device' ? 'create-device' : 'create-wound');
    setPlacementMode(null);
  };

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
      secureLogger.error('Error loading item:', err);
      alert('Failed to load item. Please try again.');
    }
  };

  const handleMarkerMove = async (id: string, regionKey: RegionKey, coords: Coordinates) => {
    try {
      const marker = markers.find(m => m.id === id);
      if (!marker?.location?.id) return;

      await updateAvatarLocation(marker.location.id, {
        x_percent: coords.x,
        y_percent: coords.y,
        region_key: regionKey
      });

      setMarkers(prevMarkers =>
        prevMarkers.map(m =>
          m.id === id
            ? { ...m, x: coords.x, y: coords.y, regionKey: regionKey }
            : m
        )
      );
    } catch (err) {
      secureLogger.error('Error moving marker:', err);
      await loadMarkers();
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
    setPendingMarker(null);
  };

  const handleSaveDevice = async (data: CreateDeviceInput | UpdateDeviceInput) => {
    if (!user?.id || !tenantId) {
      alert('Authentication error. Please log in again.');
      return;
    }

    try {
      if (panelMode === 'create-device') {
        let locationId = selectedLocationId;

        if (pendingMarker) {
          const location = await createAvatarLocation({
            tenant_id: tenantId,
            patient_id: patientId,
            region_key: pendingMarker.regionKey,
            x_percent: pendingMarker.x,
            y_percent: pendingMarker.y,
            body_view: pendingMarker.view,
            created_by: user.id
          });
          locationId = location.id;
        }

        await createDevice({
          ...data as CreateDeviceInput,
          location_id: locationId!,
          tenant_id: tenantId,
          patient_id: patientId,
          created_by: user.id
        });

        setPendingMarker(null);
      } else if (selectedDevice) {
        await updateDevice(selectedDevice.id, data as UpdateDeviceInput);
      }

      await loadMarkers();
      handleClosePanel();
    } catch (err) {
      secureLogger.error('Error saving device:', err);
      systemLogger.error('Error saving device', err, {
        component: 'AvatarBoard',
        action: panelMode === 'create-device' ? 'create_device' : 'update_device',
        metadata: {
          device_type: (data as CreateDeviceInput).type,
          reservoir_type: (data as CreateDeviceInput).reservoir_type,
          patient_id: patientId
        }
      });
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
      secureLogger.error('Error deleting device:', err);
      throw err;
    }
  };

  const handleSaveWound = async (data: CreateWoundInput | UpdateWoundInput) => {
    if (!user?.id || !tenantId) {
      alert('Authentication error. Please log in again.');
      return;
    }

    try {
      if (panelMode === 'create-wound') {
        let locationId = selectedLocationId;

        if (pendingMarker) {
          const location = await createAvatarLocation({
            tenant_id: tenantId,
            patient_id: patientId,
            region_key: pendingMarker.regionKey,
            x_percent: pendingMarker.x,
            y_percent: pendingMarker.y,
            body_view: pendingMarker.view,
            created_by: user.id
          });
          locationId = location.id;
        }

        await createWound({
          ...data as CreateWoundInput,
          location_id: locationId!,
          tenant_id: tenantId,
          patient_id: patientId,
          created_by: user.id
        });

        setPendingMarker(null);
      } else if (selectedWound) {
        await updateWound(selectedWound.id, data as UpdateWoundInput);
      }

      await loadMarkers();
      handleClosePanel();
    } catch (err) {
      secureLogger.error('Error saving wound:', err);
      systemLogger.error('Error saving wound', err, {
        component: 'AvatarBoard',
        action: panelMode === 'create-wound' ? 'create_wound' : 'update_wound',
        metadata: {
          wound_type: (data as CreateWoundInput).wound_type,
          patient_id: patientId
        }
      });
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
      secureLogger.error('Error deleting wound:', err);
      throw err;
    }
  };

  const handleRecordSelect = async (markerId: string, kind: 'device' | 'wound') => {
    if (!tenantId) return;

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
      secureLogger.error('Error loading assessments:', err);
      setDeviceAssessments([]);
      setWoundAssessments([]);
    } finally {
      setLoadingAssessments(false);
    }
  };

  const handleViewRecord = () => {
    if (!selectedRecordId || !selectedRecordType) return;
    const marker = markers.find(m => m.id === selectedRecordId);
    if (!marker) return;
    handleMarkerClick(selectedRecordId, selectedRecordType);
  };

  const handleAddAssessment = async () => {
    if (!selectedRecordId || !selectedRecordType) return;

    if (selectedRecordType === 'device') {
      try {
        const device = await getDevice(selectedRecordId);
        setSelectedDevice(device);
      } catch (err) {
        secureLogger.error('Error loading device:', err);
        alert('Failed to load device information.');
        return;
      }
    }

    setShowAssessmentModal(true);
  };

  const handleSaveAssessment = async (data: CreateAssessmentInput) => {
    try {
      if (selectedRecordType === 'wound') {
        await createAssessment(data);
      }
      setShowAssessmentModal(false);

      if (selectedRecordId && selectedRecordType && tenantId) {
        const refreshed = await getWoundAssessments(selectedRecordId, tenantId);
        setWoundAssessments(refreshed);
      }
    } catch (err) {
      secureLogger.error('Error saving wound assessment:', err);
      throw err;
    }
  };

  const handleSaveDeviceAssessment = async (data: CreateDeviceAssessmentInput) => {
    try {
      await createDeviceAssessment(data);
      setShowAssessmentModal(false);

      if (selectedRecordId && tenantId) {
        const refreshed = await getDeviceAssessmentsList(selectedRecordId, tenantId);
        setDeviceAssessments(refreshed);
      }
    } catch (err) {
      secureLogger.error('Error saving device assessment:', err);
      throw err;
    }
  };

  const handleViewDeviceAssessment = (assessment: DeviceAssessment) => {
    setSelectedDeviceAssessment(assessment);
    setShowViewAssessmentModal(true);
  };

  const handleViewWoundAssessment = (assessment: Assessment) => {
    setSelectedWoundAssessment(assessment);
    setShowViewAssessmentModal(true);
  };

  const filteredMarkers = markers.filter(marker => {
    if (marker.kind === 'device' && !showDevices) return false;
    if (marker.kind === 'wound' && !showWounds) return false;
    return true;
  });

  return {
    // State
    placementMode, setPlacementMode,
    markers,
    loading,
    error,
    pendingMarker,
    panelMode, setPanelMode,
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
    // Handlers
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
  };
}
