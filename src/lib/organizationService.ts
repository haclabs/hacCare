import { supabase } from './supabase';
import { Organization } from '../types';

/**
 * Organization Service
 * Handles all database operations for organization data
 */

export interface DatabaseOrganization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  settings: Record<string, any>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database organization to app format
 */
const convertDatabaseOrganization = (dbOrg: DatabaseOrganization): Organization => {
  return {
    id: dbOrg.id,
    name: dbOrg.name,
    slug: dbOrg.slug,
    description: dbOrg.description || undefined,
    settings: dbOrg.settings || {},
    is_active: dbOrg.is_active,
    created_by: dbOrg.created_by || undefined,
    created_at: dbOrg.created_at,
    updated_at: dbOrg.updated_at,
  };
};

/**
 * Convert app organization to database format
 */
const convertToDatabase = (org: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Omit<DatabaseOrganization, 'id' | 'created_at' | 'updated_at'> => {
  return {
    name: org.name,
    slug: org.slug,
    description: org.description || null,
    settings: org.settings,
    is_active: org.is_active,
    created_by: org.created_by || null,
  };
};

/**
 * Fetch all organizations (super admin only)
 */
export const fetchOrganizations = async (): Promise<Organization[]> => {
  try {
    console.log('Fetching organizations from database...');
    
    const { data: organizations, error } = await supabase
      .from<DatabaseOrganization>('organizations')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    if (!organizations) {
      return [];
    }

    console.log(`Found ${organizations.length} organizations`);
    return organizations.map(convertDatabaseOrganization);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    throw error;
  }
};

/**
 * Fetch organization by ID
 */
export const fetchOrganizationById = async (organizationId: string): Promise<Organization | null> => {
  try {
    console.log('Fetching organization by ID:', organizationId);
    
    const { data: organization, error } = await supabase
      .from<DatabaseOrganization>('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('Organization not found:', organizationId);
        return null;
      }
      throw error;
    }

    if (!organization) {
      return null;
    }

    console.log('Found organization:', organization.name);
    return convertDatabaseOrganization(organization);
  } catch (error) {
    console.error('Error fetching organization by ID:', error);
    throw error;
  }
};

/**
 * Create a new organization (super admin only)
 */
export const createOrganization = async (org: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> => {
  try {
    const dbOrg = convertToDatabase(org);
    
    const { data, error } = await supabase
      .from<DatabaseOrganization>('organizations')
      .insert(dbOrg)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('Organization created successfully:', data.name);
    return convertDatabaseOrganization(data);
  } catch (error) {
    console.error('Error creating organization:', error);
    throw error;
  }
};

/**
 * Update an existing organization (super admin only)
 */
export const updateOrganization = async (organizationId: string, updates: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>): Promise<Organization> => {
  try {
    const dbUpdates: Partial<Omit<DatabaseOrganization, 'id' | 'created_at' | 'updated_at'>> = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;
    if (updates.settings !== undefined) dbUpdates.settings = updates.settings;
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
    if (updates.created_by !== undefined) dbUpdates.created_by = updates.created_by || null;
    
    const { data, error } = await supabase
      .from<DatabaseOrganization>('organizations')
      .update(dbUpdates)
      .eq('id', organizationId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('Organization updated successfully:', data.name);
    return convertDatabaseOrganization(data);
  } catch (error) {
    console.error('Error updating organization:', error);
    throw error;
  }
};

/**
 * Delete an organization (super admin only)
 */
export const deleteOrganization = async (organizationId: string): Promise<void> => {
  try {
    console.log('Deleting organization:', organizationId);
    
    // Get organization info before deletion for logging
    const { data: organization } = await supabase
      .from<DatabaseOrganization>('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    const { error } = await supabase
      .from<DatabaseOrganization>('organizations')
      .delete()
      .eq('id', organizationId);

    if (error) {
      throw error;
    }
    
    console.log('Organization deleted successfully:', organization?.name);
  } catch (error) {
    console.error('Error deleting organization:', error);
    throw error;
  }
};

/**
 * Get organization statistics
 */
export const getOrganizationStats = async (organizationId: string): Promise<{
  userCount: number;
  patientCount: number;
  activePatientCount: number;
}> => {
  try {
    console.log('Fetching organization stats for:', organizationId);
    
    // Get user count
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (usersError) {
      console.error('Error fetching user count:', usersError);
    }

    // Get total patient count
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (patientsError) {
      console.error('Error fetching patient count:', patientsError);
    }

    // Get active patient count (not discharged)
    const { data: activePatients, error: activePatientsError } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .neq('condition', 'Discharged');

    if (activePatientsError) {
      console.error('Error fetching active patient count:', activePatientsError);
    }

    return {
      userCount: users?.length || 0,
      patientCount: patients?.length || 0,
      activePatientCount: activePatients?.length || 0,
    };
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    return {
      userCount: 0,
      patientCount: 0,
      activePatientCount: 0,
    };
  }
};