import { supabase } from './supabase';

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
          const { data: userId, error: userError } = await supabase.rpc(
            'add_simulation_user',
            {
              p_simulation_tenant_id: subTenant,
              p_email: userRequest.email,
              p_username: userRequest.username,
              p_role: userRequest.role,
              p_password: userRequest.password || null,
            }
          );

          if (userError) {
            console.warn(`Failed to add user ${userRequest.username}:`, userError);
            // Continue with other users instead of failing completely
          } else {
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
   * Delete a simulation and all its data
   */
  static async deleteSimulation(simulationId: string): Promise<void> {
    try {
      // First, find the tenant(s) associated with this simulation
      const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select('id, simulation_id, name')
        .eq('simulation_id', simulationId)
        .eq('tenant_type', 'simulation');

      if (tenantError) {
        throw new Error(`Failed to query simulation tenants: ${tenantError.message}`);
      }

      // Handle different scenarios
      if (!tenants || tenants.length === 0) {
        console.warn('No simulation tenant found - deleting simulation directly');
        // Just delete the active simulation directly
        const { error: simError } = await supabase
          .from('active_simulations')
          .delete()
          .eq('id', simulationId);

        if (simError) {
          throw new Error(`Failed to delete orphaned simulation: ${simError.message}`);
        }

        // Verify deletion worked
        const { data: checkData, error: checkError } = await supabase
          .from('active_simulations')
          .select('id')
          .eq('id', simulationId);

        if (checkError) {
          console.warn('Could not verify deletion:', checkError);
        } else if (checkData && checkData.length > 0) {
          throw new Error('Simulation deletion failed - record still exists');
        }

        logSuccess('Orphaned simulation deleted successfully');
        return;
      }

      if (tenants.length > 1) {
        console.warn('Multiple tenants found for simulation - deleting all');
      }

      // Delete all tenants and their associated data
      for (const tenant of tenants) {
        const simulationTenantId = tenant.id;
        console.log(`Processing tenant ${simulationTenantId} for simulation ${simulationId}`);

        // First, check what simulation_users exist for this tenant
        const { data: existingUsers, error: checkError } = await supabase
          .from('simulation_users')
          .select('id, username, simulation_tenant_id')
          .eq('simulation_tenant_id', simulationTenantId);

        if (checkError) {
          console.warn('Warning: Could not check existing users:', checkError);
        } else {
          console.log(`Found ${existingUsers?.length || 0} users for tenant ${simulationTenantId}:`, existingUsers);
        }

        // Use the safe deletion RPC function that bypasses RLS
        console.log(`Attempting to safely delete tenant ${simulationTenantId} with all related data`);
        const { error: safeDeleteError } = await supabase.rpc('delete_simulation_tenant_safe', {
          p_tenant_id: simulationTenantId
        });

        if (safeDeleteError) {
          console.error('Safe deletion failed:', safeDeleteError);
          throw new Error(`Failed to delete simulation tenant ${simulationTenantId}: ${safeDeleteError.message}`);
        }

        console.log(`✅ Successfully deleted tenant ${simulationTenantId} and all related data`);
      }

      // Delete patients and related data (vitals, medications, notes will cascade)
      const { error: patientsError } = await supabase
        .from('simulation_patients')
        .delete()
        .eq('active_simulation_id', simulationId);

      if (patientsError) {
        console.warn('Warning: Failed to delete simulation patients:', patientsError);
      }

      // Now delete the active simulation (no more foreign key constraints)
      const { error: simError } = await supabase
        .from('active_simulations')
        .delete()
        .eq('id', simulationId);

      if (simError) {
        console.warn('Warning: Failed to delete active simulation:', simError);
        // Don't throw here since the main cleanup is done
      }

      // Verify deletion worked
      const { data: checkData, error: checkError } = await supabase
        .from('active_simulations')
        .select('id')
        .eq('id', simulationId);

      if (checkError) {
        console.warn('Could not verify deletion:', checkError);
      } else if (checkData && checkData.length > 0) {
        throw new Error('Simulation deletion failed - record still exists');
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
        login_url: `${window.location.origin}/login?simulation=${simulationTenantId}`,
        users: users.map(user => ({
          username: user.username,
          email: user.email || '',
          role: user.role,
          temporary_password: '***generated***', // In real implementation, store/generate these
        })),
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
      // First, get the actual simulation ID from the tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('simulation_id')
        .eq('id', simulationTenantId)
        .single();

      if (tenantError || !tenant) {
        throw new Error(`Failed to find simulation tenant: ${tenantError?.message}`);
      }

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
          simulation_patient_vitals (
            vital_type,
            value_systolic,
            value_diastolic,
            value_numeric,
            value_text,
            unit,
            recorded_at
          ),
          simulation_patient_medications (
            medication_name,
            dosage,
            route,
            frequency,
            indication,
            is_prn,
            is_active
          ),
          simulation_patient_notes (
            note_type,
            note_content,
            created_by_name,
            created_at
          )
        `)
        .eq('active_simulation_id', tenant.simulation_id);

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
          simulation_vitals_templates (
            vital_type,
            value_systolic,
            value_diastolic,
            value_numeric,
            unit
          ),
          simulation_medications_templates (
            medication_name,
            dosage,
            route,
            frequency,
            indication
          ),
          simulation_notes_templates (
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
}

export default SimulationSubTenantService;