import { supabase } from '../../lib/api/supabase';
import type { Database } from '../../types/supabase';

/**
 * Program Type Definitions
 */
export interface Program {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface UserProgram {
  id: string;
  user_id: string;
  program_id: string;
  assigned_at: string;
  assigned_by: string | null;
  program?: Program;
}

export interface ProgramWithUserCount extends Program {
  user_count: number;
}

export interface ProgramTenant {
  tenant_id: string;
  tenant_name: string;
  program_id: string;
  program_code: string;
  program_name: string;
  subdomain: string;
}

export interface CreateProgramTenantResult {
  success: boolean;
  tenant_id?: string;
  tenant_name?: string;
  subdomain?: string;
  message?: string;
  error?: string;
}

/**
 * Student Roster Type Definitions
 */
export interface StudentRoster {
  id: string;
  user_id: string;
  program_id: string;
  cohort_id: string | null;
  student_number: string;
  enrollment_date: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  user_profile?: {
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

export interface BulkCreateStudentsResult {
  success: boolean;
  imported_count: number;
  error_count: number;
  errors: Array<{
    email: string;
    student_number: string;
    error: string;
  }>;
  message?: string;
  error?: string;
}

export interface ScheduledSimulation {
  id: string;
  template_id: string;
  program_id: string;
  name: string;
  description: string | null;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  cohort_id: string | null;
  instructor_id: string;
  room_location: string | null;
  status: 'scheduled' | 'launched' | 'completed' | 'cancelled';
  launched_simulation_id: string | null;
  student_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Program Announcements Type Definitions
 */
export interface ProgramAnnouncement {
  id: string;
  program_id: string;
  title: string;
  content: string;
  category: 'General' | 'Templates' | 'Training' | 'Students' | 'Important' | 'Reminder' | 'System Admin';
  is_pinned: boolean;
  author_id: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

/**
 * Create a program tenant for a program
 */
export async function createProgramTenant(
  programId: string,
  parentTenantId: string
): Promise<{ data: CreateProgramTenantResult | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc('create_program_tenant', {
      p_program_id: programId,
      p_parent_tenant_id: parentTenantId
    });

    if (error) throw error;
    return { data: data as CreateProgramTenantResult, error: null };
  } catch (error) {
    console.error('Error creating program tenant:', error);
    return { data: null, error };
  }
}

/**
 * Get user's program tenants
 */
export async function getUserProgramTenants(
  userId: string
): Promise<{ data: ProgramTenant[] | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc('get_user_program_tenants', {
      p_user_id: userId
    });

    if (error) throw error;
    return { data: data as ProgramTenant[], error: null };
  } catch (error) {
    console.error('Error fetching user program tenants:', error);
    return { data: null, error };
  }
}

/**
 * Get all programs for a tenant
 */
export async function getPrograms(tenantId: string): Promise<{ data: Program[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching programs:', error);
    return { data: null, error };
  }
}

/**
 * Get all programs with user counts
 */
export async function getProgramsWithUserCounts(tenantId: string): Promise<{ data: ProgramWithUserCount[] | null; error: any }> {
  try {
    const { data: programs, error: programError } = await supabase
      .from('programs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (programError) throw programError;
    if (!programs) return { data: [], error: null };

    // Get user counts for each program
    const programsWithCounts = await Promise.all(
      programs.map(async (program) => {
        const { count } = await supabase
          .from('user_programs')
          .select('*', { count: 'exact', head: true })
          .eq('program_id', program.id);

        return {
          ...program,
          user_count: count || 0
        };
      })
    );

    return { data: programsWithCounts, error: null };
  } catch (error) {
    console.error('Error fetching programs with counts:', error);
    return { data: null, error };
  }
}

/**
 * Create a new program
 */
export async function createProgram(
  tenantId: string,
  code: string,
  name: string,
  description?: string
): Promise<{ data: Program | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('programs')
      .insert({
        tenant_id: tenantId,
        code: code.toUpperCase().trim(),
        name: name.trim(),
        description: description?.trim() || null,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating program:', error);
    return { data: null, error };
  }
}

/**
 * Update a program
 */
export async function updateProgram(
  programId: string,
  updates: Partial<Pick<Program, 'name' | 'description' | 'is_active'>>
): Promise<{ data: Program | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('programs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', programId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating program:', error);
    return { data: null, error };
  }
}

/**
 * Delete a program (soft delete by setting is_active = false)
 */
export async function deleteProgram(programId: string): Promise<{ error: any }> {
  try {
    // Soft delete - set is_active to false
    const { error } = await supabase
      .from('programs')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', programId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting program:', error);
    return { error };
  }
}

/**
 * Get programs assigned to a user
 */
export async function getUserPrograms(userId: string): Promise<{ data: UserProgram[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('user_programs')
      .select(`
        *,
        program:programs (*)
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user programs:', error);
    return { data: null, error };
  }
}

/**
 * Get program codes for a user (returns just the code strings)
 */
export async function getUserProgramCodes(userId: string): Promise<{ data: string[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_program_codes', { p_user_id: userId });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching user program codes:', error);
    return { data: null, error };
  }
}

/**
 * Assign user to a program
 */
export async function assignUserToProgram(
  userId: string,
  programId: string
): Promise<{ data: UserProgram | null; error: any }> {
  try {
    const currentUser = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('user_programs')
      .insert({
        user_id: userId,
        program_id: programId,
        assigned_by: currentUser.data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error assigning user to program:', error);
    return { data: null, error };
  }
}

/**
 * Remove user from a program
 */
export async function removeUserFromProgram(
  userId: string,
  programId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('user_programs')
      .delete()
      .eq('user_id', userId)
      .eq('program_id', programId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error removing user from program:', error);
    return { error };
  }
}

/**
 * Bulk assign user to multiple programs
 */
export async function bulkAssignUserToPrograms(
  userId: string,
  programIds: string[]
): Promise<{ error: any }> {
  try {
    const currentUser = await supabase.auth.getUser();
    
    // Remove all existing assignments
    await supabase
      .from('user_programs')
      .delete()
      .eq('user_id', userId);

    // Insert new assignments
    if (programIds.length > 0) {
      const { error } = await supabase
        .from('user_programs')
        .insert(
          programIds.map(programId => ({
            user_id: userId,
            program_id: programId,
            assigned_by: currentUser.data.user?.id
          }))
        );

      if (error) throw error;

      // Grant access to program tenants
      // Get the program tenants for these programs
      const { data: programTenants, error: tenantError } = await supabase
        .from('tenants')
        .select('id, program_id')
        .in('program_id', programIds)
        .eq('tenant_type', 'program');

      if (!tenantError && programTenants && programTenants.length > 0) {
        // Grant user access to each program tenant
        const tenantUserInserts = programTenants.map(tenant => ({
          user_id: userId,
          tenant_id: tenant.id,
          role: 'instructor',
          is_active: true
        }));

        await supabase
          .from('tenant_users')
          .upsert(tenantUserInserts, {
            onConflict: 'user_id,tenant_id'
          });

        console.log(`✅ Granted access to ${programTenants.length} program tenants for user ${userId}`);
      }
    } else {
      // Remove user from all program tenants when no programs assigned
      const { data: programTenants } = await supabase
        .from('tenants')
        .select('id')
        .eq('tenant_type', 'program');

      if (programTenants && programTenants.length > 0) {
        await supabase
          .from('tenant_users')
          .delete()
          .eq('user_id', userId)
          .in('tenant_id', programTenants.map(t => t.id));
      }
    }

    return { error: null };
  } catch (error) {
    console.error('Error bulk assigning user to programs:', error);
    return { error };
  }
}

/**
 * Get users assigned to a program
 */
export async function getProgramUsers(programId: string): Promise<{ data: any[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('user_programs')
      .select(`
        *,
        user:user_profiles (
          id,
          email,
          first_name,
          last_name,
          role
        )
      `)
      .eq('program_id', programId);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching program users:', error);
    return { data: null, error };
  }
}

/**
 * Check if user has access to a specific program
 */
export async function checkUserProgramAccess(
  userId: string,
  programCode: string
): Promise<{ hasAccess: boolean; error: any }> {
  try {
    const { data, error } = await supabase
      .rpc('user_has_program_access', {
        p_user_id: userId,
        p_program_code: programCode
      });

    if (error) throw error;
    return { hasAccess: data || false, error: null };
  } catch (error) {
    console.error('Error checking program access:', error);
    return { hasAccess: false, error };
  }
}

// ============================================================================
// STUDENT ROSTER MANAGEMENT
// ============================================================================

/**
 * Get student roster for a program with pagination
 */
export async function getStudentRoster(
  programId: string,
  page: number = 0,
  pageSize: number = 50,
  search?: string
): Promise<{ data: StudentRoster[] | null; error: any; count: number }> {
  try {
    const offset = page * pageSize;
    let query = supabase
      .from('student_roster_with_profiles')
      .select('*', { count: 'exact' })
      .eq('program_id', programId)
      .eq('is_active', true)
      .order('student_number', { ascending: true })
      .range(offset, offset + pageSize - 1);

    // Add search filter if provided
    if (search) {
      query = query.or(`student_number.ilike.%${search}%,user_first_name.ilike.%${search}%,user_last_name.ilike.%${search}%,user_email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    
    // Transform view data to match StudentRoster interface
    const transformedData = data?.map(row => ({
      id: row.id,
      user_id: row.user_id,
      program_id: row.program_id,
      cohort_id: row.cohort_id,
      student_number: row.student_number,
      enrollment_date: row.enrollment_date,
      is_active: row.is_active,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      user_profile: {
        email: row.user_email,
        first_name: row.user_first_name,
        last_name: row.user_last_name,
        role: row.user_role
      }
    }));
    
    return { data: transformedData as StudentRoster[], error: null, count: count || 0 };
  } catch (error) {
    console.error('Error fetching student roster:', error);
    return { data: null, error, count: 0 };
  }
}

/**
 * Add single student to roster
 */
export async function addStudentToRoster(
  programId: string,
  userId: string,
  studentNumber: string
): Promise<{ data: StudentRoster | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('student_roster')
      .insert({
        program_id: programId,
        user_id: userId,
        student_number: studentNumber,
        enrollment_date: new Date().toISOString().split('T')[0],
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return { data: data as StudentRoster, error: null };
  } catch (error) {
    console.error('Error adding student to roster:', error);
    return { data: null, error };
  }
}

/**
 * Bulk create students from CSV
 */
export async function bulkCreateStudents(
  programId: string,
  students: Array<{
    first_name: string;
    last_name: string;
    email: string;
    student_number: string;
  }>
): Promise<{ data: BulkCreateStudentsResult | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc('bulk_create_students', {
      p_program_id: programId,
      p_students: students
    });

    if (error) throw error;
    return { data: data as BulkCreateStudentsResult, error: null };
  } catch (error) {
    console.error('Error bulk creating students:', error);
    return { data: null, error };
  }
}

/**
 * Update student roster entry
 */
export async function updateStudentRoster(
  studentId: string,
  updates: Partial<Pick<StudentRoster, 'student_number' | 'is_active' | 'notes' | 'cohort_id'>>
): Promise<{ data: StudentRoster | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('student_roster')
      .update(updates)
      .eq('id', studentId)
      .select()
      .single();

    if (error) throw error;
    return { data: data as StudentRoster, error: null };
  } catch (error) {
    console.error('Error updating student roster:', error);
    return { data: null, error };
  }
}

/**
 * Remove student from roster (soft delete)
 */
export async function removeStudentFromRoster(studentId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('student_roster')
      .update({ is_active: false })
      .eq('id', studentId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error removing student from roster:', error);
    return { error };
  }
}

// ============================================================================
// SCHEDULED SIMULATIONS (CALENDAR)
// ============================================================================

/**
 * Get scheduled simulations for a program in date range
 */
export async function getScheduledSimulations(
  programId: string,
  startDate: Date,
  endDate: Date
): Promise<{ data: ScheduledSimulation[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('scheduled_simulations')
      .select('*')
      .eq('program_id', programId)
      .gte('scheduled_start', startDate.toISOString())
      .lte('scheduled_end', endDate.toISOString())
      .order('scheduled_start', { ascending: true });

    if (error) throw error;
    return { data: data as ScheduledSimulation[], error: null };
  } catch (error) {
    console.error('Error fetching scheduled simulations:', error);
    return { data: null, error };
  }
}

/**
 * Create scheduled simulation
 */
export async function createScheduledSimulation(
  simulation: Omit<ScheduledSimulation, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'launched_simulation_id' | 'student_count'>
): Promise<{ data: ScheduledSimulation | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('scheduled_simulations')
      .insert({
        ...simulation,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return { data: data as ScheduledSimulation, error: null };
  } catch (error) {
    console.error('Error creating scheduled simulation:', error);
    return { data: null, error };
  }
}

/**
 * Update scheduled simulation
 */
export async function updateScheduledSimulation(
  simulationId: string,
  updates: Partial<ScheduledSimulation>
): Promise<{ data: ScheduledSimulation | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('scheduled_simulations')
      .update(updates)
      .eq('id', simulationId)
      .select()
      .single();

    if (error) throw error;
    return { data: data as ScheduledSimulation, error: null };
  } catch (error) {
    console.error('Error updating scheduled simulation:', error);
    return { data: null, error };
  }
}

/**
 * Delete scheduled simulation
 */
export async function deleteScheduledSimulation(simulationId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('scheduled_simulations')
      .delete()
      .eq('id', simulationId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting scheduled simulation:', error);
    return { error };
  }
}

// ============================================================================
// PROGRAM ANNOUNCEMENTS MANAGEMENT
// ============================================================================

/**
 * Get program announcements
 */
export async function getProgramAnnouncements(
  programId: string
): Promise<{ data: ProgramAnnouncement[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('program_announcements')
      .select('*')
      .eq('program_id', programId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as ProgramAnnouncement[], error: null };
  } catch (error) {
    console.error('Error fetching program announcements:', error);
    return { data: null, error };
  }
}

/**
 * Create program announcement
 */
export async function createProgramAnnouncement(
  announcement: Omit<ProgramAnnouncement, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: ProgramAnnouncement | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('program_announcements')
      .insert(announcement)
      .select()
      .single();

    if (error) throw error;
    return { data: data as ProgramAnnouncement, error: null };
  } catch (error) {
    console.error('Error creating program announcement:', error);
    return { data: null, error };
  }
}

/**
 * Update program announcement
 */
export async function updateProgramAnnouncement(
  announcementId: string,
  updates: Partial<ProgramAnnouncement>
): Promise<{ data: ProgramAnnouncement | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('program_announcements')
      .update(updates)
      .eq('id', announcementId)
      .select()
      .single();

    if (error) throw error;
    return { data: data as ProgramAnnouncement, error: null };
  } catch (error) {
    console.error('Error updating program announcement:', error);
    return { data: null, error };
  }
}

/**
 * Delete program announcement
 */
export async function deleteProgramAnnouncement(announcementId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('program_announcements')
      .delete()
      .eq('id', announcementId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting program announcement:', error);
    return { error };
  }
}

