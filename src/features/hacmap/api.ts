/**
 * hacMap API - Supabase operations for device & wound mapping
 * All operations enforce tenant isolation via RLS
 */

import { supabase } from '../../lib/api/supabase';
import type {
  AvatarLocation,
  Device,
  Wound,
  CreateAvatarLocationInput,
  CreateDeviceInput,
  UpdateDeviceInput,
  CreateWoundInput,
  UpdateWoundInput,
  MarkerWithDetails
} from '../../types/hacmap';

// ============================================================================
// AVATAR LOCATIONS
// ============================================================================

/**
 * Create a new avatar location (placement point)
 */
export async function createAvatarLocation(
  input: CreateAvatarLocationInput
): Promise<AvatarLocation> {
  const { data, error } = await supabase
    .from('avatar_locations')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('Error creating avatar location:', error);
    throw new Error(`Failed to create avatar location: ${error.message}`);
  }

  return data;
}

/**
 * Update an avatar location (for dragging markers)
 */
export async function updateAvatarLocation(
  locationId: string,
  coords: { x_percent: number; y_percent: number; region_key: string }
): Promise<AvatarLocation> {
  const { data, error } = await supabase
    .from('avatar_locations')
    .update(coords)
    .eq('id', locationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating avatar location:', error);
    throw new Error(`Failed to update avatar location: ${error.message}`);
  }

  return data;
}

/**
 * Get all markers for a patient (devices + wounds with locations)
 */
export async function listMarkers(patientId: string): Promise<MarkerWithDetails[]> {
  try {
    // Fetch devices with locations
    const { data: devicesData, error: devicesError } = await supabase
      .from('devices')
      .select(`
        *,
        location:avatar_locations!location_id(*)
      `)
      .eq('patient_id', patientId);

    if (devicesError) {
      console.error('Error fetching devices:', devicesError);
      // If table doesn't exist, return empty array instead of throwing
      if (devicesError.message?.includes('does not exist') || devicesError.code === '42P01') {
        console.warn('devices table does not exist - please run the hacmap_tables.sql migration');
        return [];
      }
      throw devicesError;
    }

    // Fetch wounds with locations
    const { data: woundsData, error: woundsError } = await supabase
      .from('wounds')
      .select(`
        *,
        location:avatar_locations!location_id(*)
      `)
      .eq('patient_id', patientId);

    if (woundsError) {
      console.error('Error fetching wounds:', woundsError);
      // If table doesn't exist, return empty array instead of throwing
      if (woundsError.message?.includes('does not exist') || woundsError.code === '42P01') {
        console.warn('wounds table does not exist - please run the hacmap_tables.sql migration');
        return [];
      }
      throw woundsError;
    }

    const markers: MarkerWithDetails[] = [];

    // Map devices
    if (devicesData) {
      devicesData.forEach((device: any) => {
        if (device.location) {
          markers.push({
            id: device.id,
            kind: 'device',
            regionKey: device.location.region_key,
            x: device.location.x_percent,
            y: device.location.y_percent,
            bodyView: device.location.body_view,
            label: device.type,
            location: device.location,
            device: device
          });
        }
      });
    }

    // Map wounds
    if (woundsData) {
      woundsData.forEach((wound: any) => {
        if (wound.location) {
          markers.push({
            id: wound.id,
            kind: 'wound',
            regionKey: wound.location.region_key,
            x: wound.location.x_percent,
            y: wound.location.y_percent,
            bodyView: wound.location.body_view,
            label: wound.wound_type,
            location: wound.location,
            wound: wound
          });
        }
      });
    }

    return markers;
  } catch (error) {
    console.error('Error listing markers:', error);
    throw error;
  }
}

// ============================================================================
// DEVICES
// ============================================================================

/**
 * Get a single device by ID
 */
export async function getDevice(id: string): Promise<Device> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching device:', error);
    throw new Error(`Failed to fetch device: ${error.message}`);
  }

  return data;
}

/**
 * Create a new device
 */
export async function createDevice(input: CreateDeviceInput): Promise<Device> {
  const { data, error } = await supabase
    .from('devices')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('Error creating device:', error);
    throw new Error(`Failed to create device: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing device
 */
export async function updateDevice(
  id: string,
  patch: UpdateDeviceInput
): Promise<Device> {
  const { data, error } = await supabase
    .from('devices')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating device:', error);
    throw new Error(`Failed to update device: ${error.message}`);
  }

  return data;
}

/**
 * Delete a device
 */
export async function deleteDevice(id: string): Promise<void> {
  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting device:', error);
    throw new Error(`Failed to delete device: ${error.message}`);
  }
}

// ============================================================================
// WOUNDS
// ============================================================================

/**
 * Get a single wound by ID
 */
export async function getWound(id: string): Promise<Wound> {
  const { data, error } = await supabase
    .from('wounds')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching wound:', error);
    throw new Error(`Failed to fetch wound: ${error.message}`);
  }

  return data;
}

/**
 * Create a new wound
 */
export async function createWound(input: CreateWoundInput): Promise<Wound> {
  const { data, error } = await supabase
    .from('wounds')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('Error creating wound:', error);
    throw new Error(`Failed to create wound: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing wound
 */
export async function updateWound(
  id: string,
  patch: UpdateWoundInput
): Promise<Wound> {
  const { data, error } = await supabase
    .from('wounds')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating wound:', error);
    throw new Error(`Failed to update wound: ${error.message}`);
  }

  return data;
}

/**
 * Delete a wound
 */
export async function deleteWound(id: string): Promise<void> {
  const { error } = await supabase
    .from('wounds')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting wound:', error);
    throw new Error(`Failed to delete wound: ${error.message}`);
  }
}
