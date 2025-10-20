import { useState, useEffect } from 'react';
import { getCurrentSubdomain } from '../../../lib/infrastructure/subdomainService';
import { getTenantBySubdomain } from '../services/admin/tenantService';
import { Tenant } from '../../../types';

/**
 * Hook to get tenant information for branding purposes
 * Works in both authenticated and unauthenticated contexts
 * Used for displaying tenant logos and branding on login page
 */
export const useTenantBranding = () => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTenantBranding = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get subdomain from URL
        const subdomain = getCurrentSubdomain();
        
        console.log('🎨 Tenant Branding: Checking subdomain:', subdomain);

        if (!subdomain) {
          // No subdomain - using main domain
          console.log('🎨 Tenant Branding: No subdomain detected, using default branding');
          setTenant(null);
          return;
        }

        // Fetch tenant by subdomain
        const { data: tenantData, error: tenantError } = await getTenantBySubdomain(subdomain);
        
        if (tenantError) {
          console.error('🎨 Tenant Branding: Error fetching tenant:', tenantError);
          setError('Failed to load tenant branding');
          setTenant(null);
          return;
        }

        if (tenantData) {
          console.log('🎨 Tenant Branding: Found tenant:', tenantData.name);
          setTenant(tenantData);
        } else {
          console.log('🎨 Tenant Branding: No tenant found for subdomain:', subdomain);
          setTenant(null);
        }

      } catch (err) {
        console.error('🎨 Tenant Branding: Unexpected error:', err);
        setError('Failed to load tenant branding');
        setTenant(null);
      } finally {
        setLoading(false);
      }
    };

    loadTenantBranding();
  }, []);

  return {
    tenant,
    loading,
    error,
    subdomain: getCurrentSubdomain(),
    isSubdomainContext: !!getCurrentSubdomain()
  };
};
