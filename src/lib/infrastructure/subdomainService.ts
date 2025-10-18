/**
 * Subdomain Detection and Tenant Resolution Service
 * 
 * This service detects the current subdomain and resolves it to a tenant.
 * Used for multi-tenant subdomain routing in production.
 */

import { getTenantBySubdomain } from '../../services/admin/tenantService';
import { Tenant } from '../../types';

/**
 * Extract subdomain from current URL
 */
export function getCurrentSubdomain(): string | null {
  // Debug logging for production troubleshooting
  console.log('🌐 Subdomain Detection Debug:', {
    isDev: import.meta.env.DEV,
    hostname: window.location.hostname,
    env: import.meta.env.MODE,
    href: window.location.href
  });

  // In development, return null (no subdomain routing)
  if (import.meta.env.DEV) {
    console.log('🚫 Development mode detected - subdomain routing disabled');
    return null;
  }

  const hostname = window.location.hostname;
  
  // Handle localhost and development environments
  if (hostname === 'localhost' || hostname.includes('127.0.0.1') || hostname.includes('.local')) {
    console.log('🚫 Localhost detected - subdomain routing disabled');
    return null;
  }

  // Split hostname into parts
  const parts = hostname.split('.');
  
  console.log('🔍 Hostname parts:', parts);
  
  // Need at least 3 parts for subdomain (subdomain.domain.com)
  if (parts.length < 3) {
    console.log('🚫 Not enough hostname parts for subdomain');
    return null;
  }

  // Return the first part as subdomain (unless it's 'www')
  const subdomain = parts[0];
  const result = subdomain === 'www' ? null : subdomain;
  
  console.log('✅ Subdomain detected:', result);
  return result;
}

/**
 * Get tenant by current subdomain
 */
export async function getCurrentTenantBySubdomain(): Promise<{ data: Tenant | null; error: any }> {
  const subdomain = getCurrentSubdomain();
  
  if (!subdomain) {
    return { data: null, error: new Error('No subdomain detected') };
  }

  try {
    const { data, error } = await getTenantBySubdomain(subdomain);
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Check if current URL is the main domain (no subdomain)
 */
export function isMainDomain(): boolean {
  return getCurrentSubdomain() === null;
}

/**
 * Redirect to tenant subdomain
 */
export function redirectToTenantSubdomain(subdomain: string, path?: string): void {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  
  // In development, add tenant as a URL parameter instead
  if (import.meta.env.DEV) {
    const currentPath = path || window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('tenant', subdomain);
    window.location.href = `${currentPath}?${searchParams.toString()}`;
    return;
  }

  // Extract base domain (remove any existing subdomain)
  const domainParts = hostname.split('.');
  const baseDomain = domainParts.length >= 2 ? domainParts.slice(-2).join('.') : hostname;
  
  const newUrl = `${protocol}//${subdomain}.${baseDomain}${port}${path || '/'}`;
  window.location.href = newUrl;
}

/**
 * Get development tenant from URL parameter
 */
export function getDevTenantFromUrl(): string | null {
  if (!import.meta.env.DEV) {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('tenant');
}

/**
 * Build URL for tenant (handles both development and production)
 */
export function buildTenantUrl(subdomain: string, path: string = '/'): string {
  if (import.meta.env.DEV) {
    const searchParams = new URLSearchParams();
    searchParams.set('tenant', subdomain);
    return `${path}?${searchParams.toString()}`;
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  
  // Extract base domain
  const domainParts = hostname.split('.');
  const baseDomain = domainParts.length >= 2 ? domainParts.slice(-2).join('.') : hostname;
  
  return `${protocol}//${subdomain}.${baseDomain}${port}${path}`;
}
