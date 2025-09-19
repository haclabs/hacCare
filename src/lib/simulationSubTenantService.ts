import { supabase } from './supabase';
import { PasswordGenerator } from './passwordGenerator';

export interface SimulationSubTenant {
  id: string;
  name: string;
  parent_tenant_id: string;
  simulation_id: string;
  auto_cleanup_at: string;
  created_at: string;
}

export interface SimulationUser {
  id: string;
  simulation_tenant_id: string;
  user_id: string;
  username: string;
  role: 'student' | 'instructor' | 'nurse';
  email?: string;
}

export interface CreateSimulationRequest {
  session_name: string;
  template_id: string;
  parent_tenant_id: string;
  users: {
    username: string;
    email: string;
    role: 'student' | 'instructor' | 'nurse';
    password?: string; // Optional - if not provided, user must exist
  }[];
}

// Simple console logging instead of toast notifications
const logSuccess = (message: string) => {
  console.log(`✅ ${message}`);
};

const logError = (message: string) => {
  console.error(`❌ ${message}`);
};

export class SimulationSubTenantService {
  // Temporary storage for generated passwords (in production, use secure storage)
  private static temporaryPasswords: Map<string, { password: string; expires: number }> = new Map();
  
  /**
   * Store a temporary password for a user
   */
  private static storeTemporaryPassword(userId: string, password: string): void {
    // Store password with 24-hour expiration
    const expires = Date.now() + (24 * 60 * 60 * 1000);
    this.temporaryPasswords.set(userId, { password, expires });
  }
  
  /**
   * Retrieve a temporary password for a user
   */
  private static getTemporaryPassword(userId: string): string | null {
    const stored = this.temporaryPasswords.get(userId);
    if (!stored || stored.expires < Date.now()) {
      this.temporaryPasswords.delete(userId);
      return null;
    }
    return stored.password;
  }

  /**
   * Creates a complete simulation environment with sub-tenant and users
   */
  static async createSimulationEnvironment(request: CreateSimulationRequest): Promise<{
    simulation_id: string;
    tenant_id: string;
    users: SimulationUser[];
  }> {
    try {
      // Validate required fields
      if (!request.session_name?.trim()) {
        throw new Error('Session name is required');
      }
      
      if (!request.parent_tenant_id?.trim()) {
        throw new Error('Parent tenant ID is required');
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User must be authenticated to create simulations');
      }

      // Handle empty template_id by creating a default scenario template if needed
      let scenarioTemplateId = request.template_id;
      if (!scenarioTemplateId?.trim() || scenarioTemplateId === '') {
        // Create a default scenario template
        const { data: template, error: templateError } = await supabase
          .from('scenario_templates')
          .insert({
            tenant_id: request.parent_tenant_id,
            name: `Default Template - ${request.session_name}`,
            description: 'Auto-generated template for simulation',
            difficulty_level: 'beginner',
            estimated_duration_minutes: 60,
            created_by: user.id,
            is_active: true,
            tags: ['auto-generated']
          })
          .select()
          .single();

        if (templateError || !template) {
          throw new Error(`Failed to create default template: ${templateError?.message || 'Unknown error'}`);
        }
        
        scenarioTemplateId = template.id;
        logSuccess(`Created default scenario template: ${template.id}`);
      }

      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(request.parent_tenant_id)) {
        throw new Error('Invalid parent tenant ID format');
      }

      if (scenarioTemplateId && !uuidRegex.test(scenarioTemplateId)) {
        throw new Error('Invalid template ID format');
      }

      if (!uuidRegex.test(user.id)) {
        throw new Error('Invalid user ID format');
      }

      // 1. Create the active simulation first
      const { data: simulation, error: simError } = await supabase
        .from('active_simulations')
        .insert({
          session_name: request.session_name,
          scenario_template_id: scenarioTemplateId,
          tenant_id: request.parent_tenant_id,
          instructor_id: user.id,
          status: 'running',
          start_time: new Date().toISOString(),
          sim_access_key: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique token (renamed column)
        })
        .select()
        .single();

      if (simError || !simulation) {
        throw new Error(`Failed to create simulation: ${simError?.message}`);
      }

      // 2. Create the sub-tenant for this simulation
      const { data: subTenant, error: tenantError } = await supabase.rpc(
        'create_simulation_subtenant',
        {
          p_simulation_id: simulation.id,
          p_simulation_name: request.session_name,
          p_parent_tenant_id: request.parent_tenant_id,
        }
      );

      if (tenantError || !subTenant) {
        throw new Error(`Failed to create simulation sub-tenant: ${tenantError?.message}`);
      }

      // 3. Add users to the simulation
      const users: SimulationUser[] = [];
        for (const userRequest of request.users) {
        try {
          // Generate a temporary password if none provided
          const temporaryPassword = userRequest.password || PasswordGenerator.generateTemporaryPassword();
          
          const { data: userId, error: userError } = await supabase.rpc(
            'add_simulation_user',
            {
              p_simulation_tenant_id: subTenant,
              p_email: userRequest.email,
              p_username: userRequest.username,
              p_role: userRequest.role,
              p_password: temporaryPassword,
            }
          );

          if (userError) {
            console.warn(`Failed to add user ${userRequest.username}:`, userError);
            // Continue with other users instead of failing completely
          } else {
            // Store the temporary password for later retrieval
            this.storeTemporaryPassword(userId, temporaryPassword);
            
            users.push({
              id: userId,
              simulation_tenant_id: subTenant,
              user_id: userId,
              username: userRequest.username,
              role: userRequest.role,
            });
            logSuccess(`Added user: ${userRequest.username}`);
          }
        } catch (userError) {
          console.warn(`Error adding user ${userRequest.username}:`, userError);
          // Continue with other users
        }
      }

      // 4. Instantiate patients from templates if scenario template exists
      try {
        const { data: patientCount, error: patientError } = await supabase.rpc(
          'instantiate_simulation_patients',
          {
            p_simulation_id: simulation.id,
            p_scenario_template_id: scenarioTemplateId
          }
        );

        if (patientError) {
          console.warn('Failed to instantiate patients from templates:', patientError);
          // Don't fail simulation creation, just log the warning
        } else {
          logSuccess(`Instantiated ${patientCount || 0} patients from templates`);
        }
      } catch (patientError) {
        console.warn('Error instantiating patients:', patientError);
        // Continue without failing simulation creation
      }

      logSuccess(`Simulation environment created with ${users.length} users`);

      return {
        simulation_id: simulation.id,
        tenant_id: subTenant,
        users,
      };
    } catch (error) {
      console.error('Error creating simulation environment:', error);
      logError('Failed to create simulation environment');
      throw error;
    }
  }

  /**
   * Get all simulation sub-tenants for a parent tenant
   */
  static async getSimulationSubTenants(parentTenantId: string): Promise<SimulationSubTenant[]> {
    try {
      // Query active_simulations directly, since some simulations may not have tenant records
      const { data: simulations, error: simError } = await supabase
        .from('active_simulations')
        .select(`
          id,
          session_name,
          status,
          start_time,
          created_at
        `)
        .order('start_time', { ascending: false });

      if (simError) {
        throw new Error(`Failed to fetch active simulations: ${simError.message}`);
      }

      // Also get any simulation tenants that do exist
      const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          parent_tenant_id,
          simulation_id,
          auto_cleanup_at,
          created_at
        `)
        .eq('parent_tenant_id', parentTenantId)
        .eq('tenant_type', 'simulation')
        .order('created_at', { ascending: false });

      if (tenantError) {
        console.warn('Warning: Failed to fetch simulation tenants:', tenantError);
      }

      // Combine the data, prioritizing simulations with tenants
      const result: SimulationSubTenant[] = [];
      const processedSimulations = new Set<string>();

      // First, add simulations that have tenant records
      if (tenants) {
        for (const tenant of tenants) {
          const simulation = simulations?.find(s => s.id === tenant.simulation_id);
          if (simulation) {
            result.push({
              id: tenant.id,
              name: tenant.name,
              parent_tenant_id: tenant.parent_tenant_id,
              simulation_id: tenant.simulation_id,
              auto_cleanup_at: tenant.auto_cleanup_at,
              created_at: tenant.created_at
            });
            processedSimulations.add(simulation.id);
          }
        }
      }

      // Then, add orphaned simulations (no tenant records)
      if (simulations) {
        for (const simulation of simulations) {
          if (!processedSimulations.has(simulation.id)) {
            result.push({
              id: simulation.id, // Use simulation ID as tenant ID for orphaned simulations
              name: `Simulation: ${simulation.session_name}`,
              parent_tenant_id: parentTenantId,
              simulation_id: simulation.id,
              auto_cleanup_at: null as any,
              created_at: simulation.created_at
            });
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error fetching simulation sub-tenants:', error);
      logError('Failed to fetch simulations');
      throw error;
    }
  }

  /**
   * Get users for a simulation sub-tenant
   */
  static async getSimulationUsers(simulationTenantId: string): Promise<SimulationUser[]> {
    try {
      console.log('Getting simulation users for tenant:', simulationTenantId);
      
      const { data, error } = await supabase
        .from('simulation_users')
        .select(`
          id,
          simulation_tenant_id,
          user_id,
          username,
          email,
          role
        `)
        .eq('simulation_tenant_id', simulationTenantId);

      console.log('Simulation users query result:', { data, error });

      if (error) {
        throw new Error(`Failed to fetch simulation users: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching simulation users:', error);
      logError('Failed to fetch simulation users');
      throw error;
    }
  }

  /**
   * Add a user to an existing simulation
   */
  static async addUserToSimulation(
    simulationTenantId: string,
    userRequest: {
      username: string;
      email: string;
      role: 'student' | 'instructor' | 'nurse';
      password?: string;
    }
  ): Promise<string> {
    try {
      const { data: userId, error } = await supabase.rpc('add_simulation_user', {
        p_simulation_tenant_id: simulationTenantId,
        p_email: userRequest.email,
        p_username: userRequest.username,
        p_role: userRequest.role,
        p_password: userRequest.password || null,
      });

      if (error) {
        throw new Error(`Failed to add user: ${error.message}`);
      }

      logSuccess(`User ${userRequest.username} added to simulation`);
      return userId;
    } catch (error) {
      console.error('Error adding user to simulation:', error);
      logError('Failed to add user to simulation');
      throw error;
    }
  }

  /**
   * Remove a user from a simulation
   */
  static async removeUserFromSimulation(
    simulationTenantId: string,
    userId: string
  ): Promise<void> {
    try {
      // Remove from tenant_users
      const { error: tenantError } = await supabase
        .from('tenant_users')
        .delete()
        .eq('tenant_id', simulationTenantId)
        .eq('user_id', userId);

      if (tenantError) {
        throw new Error(`Failed to remove user from tenant: ${tenantError.message}`);
      }

      // Remove from simulation_users
      const { error: simError } = await supabase
        .from('simulation_users')
        .delete()
        .eq('simulation_tenant_id', simulationTenantId)
        .eq('user_id', userId);

      if (simError) {
        throw new Error(`Failed to remove user from simulation: ${simError.message}`);
      }

      logSuccess('User removed from simulation');
    } catch (error) {
      console.error('Error removing user from simulation:', error);
      logError('Failed to remove user from simulation');
      throw error;
    }
  }

  /**
   * End a simulation and clean up the sub-tenant
   */
  static async endSimulation(simulationTenantId: string): Promise<void> {
    try {
      // Get simulation info
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('simulation_id')
        .eq('id', simulationTenantId)
        .single();

      if (tenantError || !tenant) {
        throw new Error(`Failed to find simulation: ${tenantError?.message}`);
      }

      // End the simulation
      const { error: endError } = await supabase
        .from('active_simulations')
        .update({
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', tenant.simulation_id);

      if (endError) {
        throw new Error(`Failed to end simulation: ${endError.message}`);
      }

      logSuccess('Simulation ended successfully');
    } catch (error) {
      console.error('Error ending simulation:', error);
      logError('Failed to end simulation');
      throw error;
    }
  }

  /**
   * Delete a simulation and all associated data
   * @param simulationTenantId - The tenant ID (not the simulation ID)
   */
  static async deleteSimulation(simulationTenantId: string): Promise<void> {
    try {
      console.log('Deleting simulation for tenant ID:', simulationTenantId);
      
      // First, get the tenant information and the linked simulation ID
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, simulation_id, name, tenant_type')
        .eq('id', simulationTenantId)
        .single();

      if (tenantError) {
        throw new Error(`Failed to query simulation tenant: ${tenantError.message}`);
      }

      if (!tenant) {
        throw new Error('Simulation tenant not found');
      }

      if (tenant.tenant_type !== 'simulation') {
        throw new Error('This is not a simulation tenant');
      }

      console.log('Found simulation tenant:', tenant);

      const actualSimulationId = tenant.simulation_id;
      
      if (!actualSimulationId) {
        console.warn('Tenant has no linked simulation - deleting tenant only');
        // Use safe deletion for tenant without simulation
        const { error: safeDeleteError } = await supabase.rpc('delete_simulation_tenant_safe', {
          p_tenant_id: simulationTenantId
        });

        if (safeDeleteError) {
          throw new Error(`Failed to delete simulation tenant: ${safeDeleteError.message}`);
        }

        logSuccess('Simulation tenant deleted successfully');
        return;
      }

      console.log('Deleting simulation with ID:', actualSimulationId);

      // Check if there are other tenants linked to this same simulation
      const { data: otherTenants, error: otherTenantsError } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('simulation_id', actualSimulationId)
        .neq('id', simulationTenantId);

      if (otherTenantsError) {
        console.warn('Could not check for other tenants:', otherTenantsError);
      }

      // Use the safe deletion RPC function that bypasses RLS
      console.log(`Attempting to safely delete tenant ${simulationTenantId} with all related data`);
      const { error: safeDeleteError } = await supabase.rpc('delete_simulation_tenant_safe', {
        p_tenant_id: simulationTenantId
      });

      if (safeDeleteError) {
        console.error('Safe deletion failed:', safeDeleteError);
        throw new Error(`Failed to delete simulation tenant: ${safeDeleteError.message}`);
      }

      console.log(`✅ Successfully deleted tenant ${simulationTenantId} and all related data`);

      // If there are no other tenants linked to this simulation, delete the simulation data too
      if (!otherTenants || otherTenants.length === 0) {
        console.log('No other tenants found - deleting simulation data');
        
        // Delete patients and related data (vitals, medications, notes will cascade)
        const { error: patientsError } = await supabase
          .from('simulation_patients')
          .delete()
          .eq('active_simulation_id', actualSimulationId);

        if (patientsError) {
          console.warn('Warning: Failed to delete simulation patients:', patientsError);
        }

        // Now delete the active simulation (no more foreign key constraints)
        const { error: simError } = await supabase
          .from('active_simulations')
          .delete()
          .eq('id', actualSimulationId);

        if (simError) {
          console.warn('Warning: Failed to delete active simulation:', simError);
          // Don't throw here since the main cleanup is done
        }

        console.log('✅ Deleted simulation data for ID:', actualSimulationId);
      } else {
        console.log(`Found ${otherTenants.length} other tenants linked to this simulation - keeping simulation data`);
      }

      logSuccess('Simulation deleted successfully');
    } catch (error) {
      console.error('Error deleting simulation:', error);
      logError('Failed to delete simulation');
      throw error;
    }
  }

  /**
   * Generate login credentials for simulation users
   */
  static async getSimulationLoginCredentials(simulationTenantId: string): Promise<{
    simulation_name: string;
    login_url: string;
    users: {
      username: string;
      email: string;
      role: string;
      temporary_password?: string;
    }[];
  }> {
    try {
      // Get simulation info - use explicit join to avoid ambiguous relationship
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          name,
          simulation_id
        `)
        .eq('id', simulationTenantId)
        .single();

      if (tenantError || !tenant) {
        throw new Error(`Failed to find simulation tenant: ${tenantError?.message}`);
      }

      // Get the actual simulation details
      const { data: simulation, error: simError } = await supabase
        .from('active_simulations')
        .select('session_name')
        .eq('id', tenant.simulation_id)
        .single();

      if (simError || !simulation) {
        throw new Error(`Failed to find simulation: ${simError?.message}`);
      }

      // Get users
      const users = await this.getSimulationUsers(simulationTenantId);

      return {
        simulation_name: simulation.session_name,
        login_url: `${window.location.origin}/simulation-login?simulation=${simulationTenantId}&name=${encodeURIComponent(simulation.session_name)}`,
        users: users.map(user => {
          const temporaryPassword = this.getTemporaryPassword(user.user_id);
          return {
            username: user.username,
            email: user.email || '',
            role: user.role,
            temporary_password: temporaryPassword || 'Contact instructor for password',
          };
        }),
      };
    } catch (error) {
      console.error('Error getting simulation credentials:', error);
      logError('Failed to get simulation credentials');
      throw error;
    }
  }

  /**
   * Check if current user is in a simulation tenant and get lobby status
   */
  static async getCurrentUserSimulationContext(): Promise<{
    isInSimulation: boolean;
    simulationTenantId?: string;
    simulationName?: string;
    simulationId?: string;
    role?: string;
    simulationStatus?: 'lobby' | 'running' | 'paused' | 'completed';
  }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { isInSimulation: false };
      }

      const { data, error } = await supabase
        .from('tenant_users')
        .select(`
          tenant_id,
          role,
          tenants!inner(
            name,
            tenant_type,
            simulation_id
          )
        `)
        .eq('user_id', user.user.id)
        .eq('tenants.tenant_type', 'simulation')
        .single();

      if (error || !data) {
        return { isInSimulation: false };
      }

      // Get simulation info with proper typing
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('name, tenant_type, simulation_id')
        .eq('id', data.tenant_id)
        .eq('tenant_type', 'simulation')
        .single();

      if (tenantError || !tenantData) {
        return { isInSimulation: false };
      }

      // Get simulation status
      const { data: simulationData, error: simError } = await supabase
        .from('active_simulations')
        .select('simulation_status')
        .eq('id', tenantData.simulation_id)
        .single();

      if (simError) {
        console.error('Failed to fetch simulation status:', simError);
      }

      return {
        isInSimulation: true,
        simulationTenantId: data.tenant_id,
        simulationName: tenantData.name,
        simulationId: tenantData.simulation_id,
        role: data.role,
        simulationStatus: simulationData?.simulation_status || 'lobby',
      };
    } catch (error) {
      console.error('Error checking simulation context:', error);
      return { isInSimulation: false };
    }
  }

  /**
   * Join simulation lobby (called when user first logs in)
   */
  static async joinSimulationLobby(simulationId: string): Promise<{
    simulation_status: string;
    lobby_message: string;
    user_role: string;
    can_start_simulation: boolean;
  }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.rpc('join_simulation_lobby', {
        p_simulation_id: simulationId,
        p_user_id: user.user.id,
      });

      if (error) {
        throw new Error(`Failed to join lobby: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error joining simulation lobby:', error);
      logError('Failed to join simulation lobby');
      throw error;
    }
  }

  /**
   * Start simulation (instructor only)
   */
  static async startSimulation(simulationId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase.rpc('start_simulation', {
        p_simulation_id: simulationId,
        p_instructor_id: user.user.id,
      });

      if (error) {
        throw new Error(`Failed to start simulation: ${error.message}`);
      }

      logSuccess('Simulation started successfully');
    } catch (error) {
      console.error('Error starting simulation:', error);
      logError('Failed to start simulation');
      throw error;
    }
  }

  /**
   * Get lobby status and participants
   */
  static async getLobbyStatus(simulationId: string): Promise<{
    users: any[];
    simulation_status: string;
    lobby_message: string;
  }> {
    try {
      const { data: users, error: usersError } = await supabase
        .from('simulation_lobby_status')
        .select('*')
        .eq('simulation_id', simulationId);

      if (usersError) {
        throw new Error(`Failed to fetch lobby users: ${usersError.message}`);
      }

      const { data: simulation, error: simError } = await supabase
        .from('active_simulations')
        .select('simulation_status, lobby_message')
        .eq('id', simulationId)
        .single();

      if (simError) {
        throw new Error(`Failed to fetch simulation status: ${simError.message}`);
      }

      return {
        users: users || [],
        simulation_status: simulation.simulation_status,
        lobby_message: simulation.lobby_message,
      };
    } catch (error) {
      console.error('Error getting lobby status:', error);
      logError('Failed to get lobby status');
      throw error;
    }
  }

  /**
   * Reset simulation to template defaults
   */
  static async resetSimulation(simulationTenantId: string): Promise<boolean> {
    try {
      // First, get the actual simulation ID from the tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('simulation_id')
        .eq('id', simulationTenantId)
        .single();

      if (tenantError || !tenant) {
        throw new Error(`Failed to find simulation tenant: ${tenantError?.message}`);
      }

      // Now reset using the actual simulation ID
      const { data: success, error } = await supabase.rpc(
        'reset_simulation_to_template',
        { p_simulation_id: tenant.simulation_id }
      );

      if (error) {
        throw new Error(`Failed to reset simulation: ${error.message}`);
      }

      logSuccess('Simulation reset to template defaults');
      return success;
    } catch (error) {
      console.error('Error resetting simulation:', error);
      logError('Failed to reset simulation');
      throw error;
    }
  }

  /**
   * Get simulation patients with their data
   */
  static async getSimulationPatients(simulationTenantId: string): Promise<any[]> {
    try {
      console.log('Getting simulation patients for tenant:', simulationTenantId);
      
      // First, get the actual simulation ID from the tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('simulation_id, subdomain')
        .eq('id', simulationTenantId);

      console.log('Tenant query result:', { data: tenant, error: tenantError });

      if (tenantError) {
        throw new Error(`Failed to query simulation tenant: ${tenantError.message}`);
      }

      if (!tenant || tenant.length === 0) {
        console.log('No tenant found with ID:', simulationTenantId);
        return []; // No tenant found, return empty array
      }

      if (tenant.length > 1) {
        console.warn('Multiple tenants found with same ID, using first one');
      }

      const tenantRecord = tenant[0];
      
      if (!tenantRecord.simulation_id) {
        console.log('Tenant has no simulation_id, returning empty patients array');
        return []; // No simulation linked to this tenant
      }

      console.log('Found simulation ID:', tenantRecord.simulation_id);

      // Now get patients using the actual simulation ID
      const { data: patients, error } = await supabase
        .from('simulation_patients')
        .select(`
          id,
          patient_id,
          patient_name,
          age,
          gender,
          diagnosis,
          condition,
          room_number,
          bed_number,
          template_id,
          created_at
        `)
        .eq('active_simulation_id', tenantRecord.simulation_id);

      console.log('Patients query result:', { data: patients, error });

      if (error) {
        throw new Error(`Failed to get simulation patients: ${error.message}`);
      }

      return patients || [];
    } catch (error) {
      console.error('Error getting simulation patients:', error);
      logError('Failed to get simulation patients');
      throw error;
    }
  }

  /**
   * Get patient templates for a scenario
   */
  static async getPatientTemplates(scenarioTemplateId: string): Promise<any[]> {
    try {
      const { data: templates, error } = await supabase
        .from('simulation_patient_templates')
        .select(`
          id,
          template_name,
          patient_name,
          age,
          gender,
          diagnosis,
          condition,
          allergies,
          blood_type,
          patient_vitals_templates (
            vital_type,
            value_systolic,
            value_diastolic,
            value_numeric,
            unit
          ),
          patient_medications_templates (
            medication_name,
            dosage,
            route,
            frequency,
            indication
          ),
          patient_notes_templates (
            note_type,
            note_content,
            created_by_role
          )
        `)
        .eq('scenario_template_id', scenarioTemplateId)
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to get patient templates: ${error.message}`);
      }

      return templates || [];
    } catch (error) {
      console.error('Error getting patient templates:', error);
      logError('Failed to get patient templates');
      throw error;
    }
  }

  /**
   * Authenticate a simulation user using username/password
   */
  static async authenticateSimulationUser(
    username: string, 
    password: string, 
    simulationTenantId?: string
  ): Promise<{
    success: boolean;
    user?: {
      user_id: string;
      username: string;
      email: string;
      role: string;
      tenant_id: string;
      tenant_name: string;
      simulation_id: string;
    };
    error?: string;
  }> {
    try {
      console.log('Authenticating simulation user:', username, 'in tenant:', simulationTenantId);
      
      const { data, error } = await supabase.rpc('authenticate_simulation_user', {
        p_username: username,
        p_password: password,
        p_simulation_tenant_id: simulationTenantId || null
      });

      if (error) {
        console.error('Authentication error:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        console.log('No matching user found');
        return { success: false, error: 'Invalid username or password' };
      }

      const user = data[0];
      console.log('Authentication successful for user:', user.username);
      
      return { 
        success: true, 
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          tenant_id: user.tenant_id,
          tenant_name: user.tenant_name,
          simulation_id: user.simulation_id
        }
      };
    } catch (error) {
      console.error('Failed to authenticate simulation user:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Get available scenario templates for a tenant
   */
  static async getScenarioTemplates(tenantId: string): Promise<any[]> {
    try {
      console.log('Getting scenario templates for tenant:', tenantId);
      
      const { data, error } = await supabase
        .from('scenario_templates')
        .select(`
          id,
          name,
          description,
          difficulty_level,
          estimated_duration_minutes,
          learning_objectives,
          tags
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      console.log('Scenario templates query result:', { data, error, tenantId });

      if (error) {
        throw new Error(`Failed to get scenario templates: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting scenario templates:', error);
      logError('Failed to get scenario templates');
      throw error;
    }
  }

  /**
   * Instantiate template patients for a simulation
   */
  static async instantiateTemplatePatients(simulationTenantId: string, scenarioTemplateId: string): Promise<any> {
    try {
      console.log('Instantiating template patients for simulation:', simulationTenantId, 'template:', scenarioTemplateId);
      
      // First get the simulation ID from the tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('simulation_id')
        .eq('id', simulationTenantId);

      if (tenantError || !tenant || tenant.length === 0) {
        throw new Error(`Failed to find simulation tenant: ${tenantError?.message || 'Tenant not found'}`);
      }

      const tenantRecord = tenant[0];
      
      if (!tenantRecord.simulation_id) {
        throw new Error('Tenant has no simulation_id linked');
      }

      // Call the RPC function to instantiate patients
      const { data, error } = await supabase.rpc('instantiate_simulation_patients', {
        p_simulation_id: tenantRecord.simulation_id,
        p_scenario_template_id: scenarioTemplateId
      });

      if (error) {
        throw new Error(`Failed to instantiate template patients: ${error.message}`);
      }

      console.log('Template patients instantiated successfully:', data);
      return data;
    } catch (error) {
      console.error('Error instantiating template patients:', error);
      logError('Failed to instantiate template patients');
      throw error;
    }
  }

  /**
   * Reset simulation patients (clear and regenerate from template)
   */
  static async resetSimulationPatients(simulationTenantId: string): Promise<any> {
    try {
      console.log('Resetting simulation patients for:', simulationTenantId);
      
      // First get the simulation ID and scenario template ID from the tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          simulation_id,
          active_simulations!tenants_simulation_id_fkey (
            scenario_template_id
          )
        `)
        .eq('id', simulationTenantId);

      if (tenantError || !tenant || tenant.length === 0) {
        throw new Error(`Failed to find simulation tenant: ${tenantError?.message || 'Tenant not found'}`);
      }

      const tenantRecord = tenant[0];
      
      if (!tenantRecord.simulation_id) {
        throw new Error('Tenant has no simulation_id linked');
      }

      const activeSimulation = tenantRecord.active_simulations as any;
      if (!activeSimulation?.scenario_template_id) {
        throw new Error('Simulation has no scenario template linked');
      }

      // Call the RPC function to reset and regenerate patients
      const { data, error } = await supabase.rpc('reset_simulation_to_template', {
        p_simulation_id: tenantRecord.simulation_id
      });

      if (error) {
        throw new Error(`Failed to reset simulation patients: ${error.message}`);
      }

      console.log('Simulation patients reset successfully:', data);
      return data;
    } catch (error) {
      console.error('Error resetting simulation patients:', error);
      logError('Failed to reset simulation patients');
      throw error;
    }
  }

  // Additional Template Management Methods
  static async createScenarioTemplate(tenantId: string, template: any): Promise<any> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User must be authenticated');
      }

      const { data, error } = await supabase
        .from('scenario_templates')
        .insert({
          tenant_id: tenantId,
          name: template.name,
          description: template.description,
          learning_objectives: template.learning_objectives || [],
          difficulty_level: template.difficulty_level || 'beginner',
          estimated_duration_minutes: template.estimated_duration_minutes || 30,
          tags: template.tags || [],
          is_active: template.is_active ?? true,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating scenario template:', error);
        throw error;
      }

      logSuccess('Scenario template created successfully');
      return data;
    } catch (error) {
      console.error('Failed to create scenario template:', error);
      logError('Failed to create scenario template');
      throw error;
    }
  }

  static async createPatientTemplate(scenarioTemplateId: string, template: any): Promise<any> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User must be authenticated');
      }

      // Debug logging
      console.log('Creating patient template with data:', {
        scenarioTemplateId,
        template_name: template.template_name,
        patient_name: template.patient_name,
        template: template
      });

      const { data, error } = await supabase
        .from('simulation_patient_templates')
        .insert({
          scenario_template_id: scenarioTemplateId,
          template_name: template.template_name || template.patient_name || 'Untitled Template',
          patient_name: template.patient_name,
          age: template.age,
          gender: template.gender,
          date_of_birth: template.date_of_birth,
          room_number: template.room_number,
          bed_number: template.bed_number,
          diagnosis: template.diagnosis,
          condition: template.condition || 'Stable',
          allergies: template.allergies || [],
          blood_type: template.blood_type,
          emergency_contact_name: template.emergency_contact_name,
          emergency_contact_relationship: template.emergency_contact_relationship,
          emergency_contact_phone: template.emergency_contact_phone,
          assigned_nurse: template.assigned_nurse,
          is_active: template.is_active ?? true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating patient template:', error);
        throw error;
      }

      logSuccess('Patient template created successfully');
      return data;
    } catch (error) {
      console.error('Failed to create patient template:', error);
      logError('Failed to create patient template');
      throw error;
    }
  }

  /**
   * Update an existing patient template
   */
  static async updatePatientTemplate(templateId: string, template: any): Promise<any> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User must be authenticated');
      }

      // Debug logging
      console.log('Updating patient template with data:', {
        templateId,
        template_name: template.template_name,
        patient_name: template.patient_name,
        template: template
      });

      const { data, error } = await supabase
        .from('simulation_patient_templates')
        .update({
          template_name: template.template_name || template.patient_name || 'Untitled Template',
          patient_name: template.patient_name,
          age: template.age,
          gender: template.gender,
          date_of_birth: template.date_of_birth,
          room_number: template.room_number,
          bed_number: template.bed_number,
          diagnosis: template.diagnosis,
          condition: template.condition || 'Stable',
          allergies: template.allergies || [],
          blood_type: template.blood_type,
          emergency_contact_name: template.emergency_contact_name,
          emergency_contact_relationship: template.emergency_contact_relationship,
          emergency_contact_phone: template.emergency_contact_phone,
          assigned_nurse: template.assigned_nurse,
          is_active: template.is_active ?? true,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .select()
        .single();

      if (error) {
        console.error('Error updating patient template:', error);
        throw error;
      }

      logSuccess('Patient template updated successfully');
      return data;
    } catch (error) {
      console.error('Failed to update patient template:', error);
      logError('Failed to update patient template');
      throw error;
    }
  }

  /**
   * Save or update patient template (create if new, update if existing)
   */
  static async savePatientTemplate(scenarioTemplateId: string, template: any): Promise<any> {
    if (template.id) {
      // Update existing template
      return this.updatePatientTemplate(template.id, template);
    } else {
      // Create new template
      return this.createPatientTemplate(scenarioTemplateId, template);
    }
  }

  // User Management Methods for Enhanced Simulation Creation
  static async getExistingTenantUsers(tenantId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_tenant_associations')
        .select(`
          user_id,
          role,
          users!inner (
            id,
            email,
            username,
            full_name,
            last_sign_in_at,
            user_metadata
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching tenant users:', error);
        throw error;
      }

      // Transform the data to match the expected format
      const users = (data || []).map((association: any) => ({
        id: association.users.id,
        email: association.users.email,
        username: association.users.username || association.users.email?.split('@')[0],
        full_name: association.users.full_name,
        role: association.role,
        last_sign_in_at: association.users.last_sign_in_at,
        is_simulation_user: association.users.user_metadata?.is_simulation_user || false
      }));

      return users;
    } catch (error) {
      console.error('Failed to fetch tenant users:', error);
      // Return empty array if there's an error rather than throwing
      return [];
    }
  }

  /**
   * Save patient vitals templates
   */
  static async savePatientVitalsTemplates(patientTemplateId: string, vitalsTemplates: any[]): Promise<any> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User must be authenticated');
      }

      // First, delete existing vitals templates for this patient
      await supabase
        .from('patient_vitals_templates')
        .delete()
        .eq('patient_template_id', patientTemplateId);

      // Insert new vitals templates
      const vitalsToInsert = vitalsTemplates.map(vital => ({
        patient_template_id: patientTemplateId,
        vital_type: vital.vital_type,
        value_systolic: vital.value_systolic,
        value_diastolic: vital.value_diastolic,
        value_numeric: vital.value_numeric,
        unit: vital.unit,
        normal_range_min: vital.normal_range_min,
        normal_range_max: vital.normal_range_max,
        notes: vital.notes || '',
        frequency_minutes: vital.frequency_minutes || 60,
        is_critical: vital.is_critical || false,
        display_order: vital.display_order || 0,
        created_by: user.id
      }));

      if (vitalsToInsert.length > 0) {
        const { data, error } = await supabase
          .from('patient_vitals_templates')
          .insert(vitalsToInsert)
          .select();

        if (error) {
          throw error;
        }

        logSuccess(`Saved ${vitalsToInsert.length} vitals templates`);
        return data;
      }

      return [];
    } catch (error) {
      console.error('Failed to save vitals templates:', error);
      logError('Failed to save vitals templates');
      throw error;
    }
  }

  /**
   * Save patient medications templates
   */
  static async savePatientMedicationsTemplates(patientTemplateId: string, medicationsTemplates: any[]): Promise<any> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User must be authenticated');
      }

      // First, delete existing medication templates for this patient
      await supabase
        .from('patient_medications_templates')
        .delete()
        .eq('patient_template_id', patientTemplateId);

      // Insert new medication templates
      const medicationsToInsert = medicationsTemplates.map(med => ({
        patient_template_id: patientTemplateId,
        medication_name: med.medication_name,
        generic_name: med.generic_name,
        dosage: med.dosage,
        route: med.route,
        frequency: med.frequency,
        indication: med.indication,
        contraindications: med.contraindications,
        side_effects: med.side_effects || [],
        is_prn: med.is_prn || false,
        prn_parameters: med.prn_parameters,
        start_date: med.start_date,
        end_date: med.end_date,
        max_dose_per_day: med.max_dose_per_day,
        notes: med.notes || '',
        barcode: med.barcode,
        display_order: med.display_order || 0,
        is_active: med.is_active ?? true,
        created_by: user.id
      }));

      if (medicationsToInsert.length > 0) {
        const { data, error } = await supabase
          .from('patient_medications_templates')
          .insert(medicationsToInsert)
          .select();

        if (error) {
          throw error;
        }

        logSuccess(`Saved ${medicationsToInsert.length} medication templates`);
        return data;
      }

      return [];
    } catch (error) {
      console.error('Failed to save medication templates:', error);
      logError('Failed to save medication templates');
      throw error;
    }
  }

  /**
   * Save patient notes templates
   */
  static async savePatientNotesTemplates(patientTemplateId: string, notesTemplates: any[]): Promise<any> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User must be authenticated');
      }

      // First, delete existing notes templates for this patient
      await supabase
        .from('patient_notes_templates')
        .delete()
        .eq('patient_template_id', patientTemplateId);

      // Insert new notes templates
      const notesToInsert = notesTemplates.map(note => ({
        patient_template_id: patientTemplateId,
        note_type: note.note_type,
        note_title: note.note_title,
        note_content: note.note_content,
        created_by_role: note.created_by_role,
        timestamp_offset_hours: note.timestamp_offset_hours || 0,
        is_locked: note.is_locked || false,
        requires_signature: note.requires_signature || false,
        tags: note.tags || [],
        display_order: note.display_order || 0,
        created_by: user.id
      }));

      if (notesToInsert.length > 0) {
        const { data, error } = await supabase
          .from('patient_notes_templates')
          .insert(notesToInsert)
          .select();

        if (error) {
          throw error;
        }

        logSuccess(`Saved ${notesToInsert.length} note templates`);
        return data;
      }

      return [];
    } catch (error) {
      console.error('Failed to save note templates:', error);
      logError('Failed to save note templates');
      throw error;
    }
  }

  /**
   * Save complete patient template with all related data
   */
  static async saveCompletePatientTemplate(
    scenarioTemplateId: string, 
    patientInfo: any, 
    vitals: any[], 
    medications: any[], 
    notes: any[]
  ): Promise<any> {
    try {
      // Save or update the patient template
      const patientTemplate = await this.savePatientTemplate(scenarioTemplateId, patientInfo);
      
      // Then save all the related templates
      await Promise.all([
        this.savePatientVitalsTemplates(patientTemplate.id, vitals),
        this.savePatientMedicationsTemplates(patientTemplate.id, medications),
        this.savePatientNotesTemplates(patientTemplate.id, notes)
      ]);

      logSuccess('Complete patient template saved successfully');
      return patientTemplate;
    } catch (error) {
      console.error('Failed to save complete patient template:', error);
      logError('Failed to save complete patient template');
      throw error;
    }
  }

  /**
   * Delete a scenario template and all related data
   */
  static async deleteScenarioTemplate(scenarioTemplateId: string): Promise<boolean> {
    try {
      console.log('Deleting scenario template:', scenarioTemplateId);
      
      const { data, error } = await supabase.rpc('delete_scenario_template', {
        p_scenario_template_id: scenarioTemplateId
      });

      if (error) {
        console.error('Failed to delete scenario template:', error);
        logError('Failed to delete scenario template');
        throw error;
      }

      logSuccess('Scenario template deleted successfully');
      return data || true;
    } catch (error) {
      console.error('Failed to delete scenario template:', error);
      logError('Failed to delete scenario template');
      throw error;
    }
  }

  /**
   * Delete a patient template and all related data
   */
  static async deletePatientTemplate(patientTemplateId: string): Promise<boolean> {
    try {
      console.log('Deleting patient template:', patientTemplateId);
      
      const { data, error } = await supabase.rpc('delete_patient_template', {
        p_patient_template_id: patientTemplateId
      });

      if (error) {
        console.error('Failed to delete patient template:', error);
        logError('Failed to delete patient template');
        throw error;
      }

      logSuccess('Patient template deleted successfully');
      return data || true;
    } catch (error) {
      console.error('Failed to delete patient template:', error);
      logError('Failed to delete patient template');
      throw error;
    }
  }
}

export default SimulationSubTenantService;