import React from 'react';
import { Building2, Heart, Shield } from 'lucide-react';
import { Tenant } from '../../types';

interface TenantLogoProps {
  tenant?: Tenant | null;
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
  className?: string;
}

/**
 * TenantLogo Component
 * 
 * Displays tenant-specific branding including logo, name, and colors
 * Falls back to default hacCare branding when no tenant is specified
 * 
 * Features:
 * - Tenant logo image support (logo_url from database)
 * - Tenant primary color theming
 * - Fallback to default hacCare branding
 * - Multiple size variants
 * - Healthcare-themed default icons
 */
export const TenantLogo: React.FC<TenantLogoProps> = ({
  tenant,
  size = 'medium',
  showSubtitle = true,
  className = ''
}) => {
  // Size configurations
  const sizeConfig = {
    small: {
      container: 'mb-4',
      title: 'text-2xl',
      subtitle: 'text-xs',
      logo: 'h-8 w-8',
      spacing: 'space-x-2'
    },
    medium: {
      container: 'mb-6',
      title: 'text-4xl',
      subtitle: 'text-sm',
      logo: 'h-12 w-12',
      spacing: 'space-x-3'
    },
    large: {
      container: 'mb-8',
      title: 'text-5xl',
      subtitle: 'text-base',
      logo: 'h-16 w-16',
      spacing: 'space-x-4'
    }
  };

  const config = sizeConfig[size];

  // Default hacCare branding
  if (!tenant) {
    return (
      <div className={`text-center ${config.container} ${className}`}>
        <div className="flex justify-center items-center mb-1">
          <div className="flex items-center">
            <div className="text-left">
              <h1 className={`${config.title} font-bold text-gray-800 leading-none`}>
                haccare
              </h1>
              {showSubtitle && (
                <p className={`${config.subtitle} text-gray-500 font-medium mt-1`}>
                  patient record system
                </p>
              )}
            </div>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-2">Secure Portal Access</p>
      </div>
    );
  }

  // Tenant-specific branding
  const logoUrl = tenant.settings?.logo_url;
  const primaryColor = tenant.settings?.primary_color || tenant.primary_color || '#3B82F6';
  const tenantName = tenant.name || 'Healthcare Organization';

  return (
    <div className={`text-center ${config.container} ${className}`}>
      {/* Tenant Logo */}
      <div className="flex justify-center items-center mb-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Organization logo"
            className={`${config.logo} object-contain rounded-lg`}
            onError={(e) => {
              // Fallback to icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        
        {/* Fallback icon (only shown if no logo or image fails to load) */}
        <div 
          className={`${config.logo} rounded-lg flex items-center justify-center text-white ${logoUrl ? 'hidden' : 'flex'}`}
          style={{ backgroundColor: primaryColor }}
        >
          <Building2 className="h-2/3 w-2/3" />
        </div>
      </div>

      {/* Powered by hacCare */}
      <div className="flex items-center justify-center space-x-1 text-xs text-gray-400">
        <span>Powered by</span>
        <Heart className="h-3 w-3 text-red-400" />
        <span className="font-medium">hacCare</span>
      </div>
    </div>
  );
};
