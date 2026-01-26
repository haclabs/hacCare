import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getUserProgramCodes } from '../services/admin/programService';

/**
 * Hook to get current user's assigned program codes and check access
 * 
 * Returns:
 * - programCodes: Array of program codes user has access to (e.g., ['NESA', 'PN'])
 * - hasProgram: Function to check if user has access to a specific program
 * - canSeeAllPrograms: Boolean - true if user is super_admin or coordinator
 * - filterByPrograms: Function to filter arrays based on program access
 */
export function useUserProgramAccess() {
  const { user, profile } = useAuth();

  // Super admins and coordinators can see all programs
  const canSeeAllPrograms = profile?.role === 'super_admin' || profile?.role === 'coordinator';

  // Fetch user's program codes
  const { data: programCodes = [], isLoading } = useQuery({
    queryKey: ['userPrograms', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      if (canSeeAllPrograms) return []; // Don't need to fetch for super_admin/coordinator
      
      const { data, error } = await getUserProgramCodes(user.id);
      if (error) {
        console.error('Error fetching user programs:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  /**
   * Check if user has access to a specific program
   */
  const hasProgram = (programCode: string): boolean => {
    if (canSeeAllPrograms) return true;
    if (!programCodes || programCodes.length === 0) return false;
    return programCodes.includes(programCode);
  };

  /**
   * Filter an array of items by primary_categories matching user's programs
   * 
   * @param items - Array of items with primary_categories field
   * @returns Filtered array
   */
  const filterByPrograms = <T extends { primary_categories?: string[] | null }>(items: T[]): T[] => {
    if (canSeeAllPrograms) return items;
    if (!programCodes || programCodes.length === 0) return [];

    return items.filter(item => {
      if (!item.primary_categories || item.primary_categories.length === 0) {
        // Items with no categories are visible to all
        return true;
      }
      
      // Check if any of the item's categories match user's programs
      return item.primary_categories.some(cat => programCodes.includes(cat));
    });
  };

  /**
   * Check if any of the given categories are accessible to the user
   */
  const hasCategoryAccess = (categories: string[] | null | undefined): boolean => {
    if (canSeeAllPrograms) return true;
    if (!categories || categories.length === 0) return true; // Uncategorized items visible to all
    if (!programCodes || programCodes.length === 0) return false;
    
    return categories.some(cat => programCodes.includes(cat));
  };

  return {
    programCodes,
    isLoading,
    hasProgram,
    canSeeAllPrograms,
    filterByPrograms,
    hasCategoryAccess,
    isInstructor: profile?.role === 'instructor',
    isCoordinator: profile?.role === 'coordinator',
  };
}
