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
