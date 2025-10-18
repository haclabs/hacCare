import { supabase } from '../../lib/api/supabase';

/**
 * File Upload Service
 * 
 * Handles file uploads to Supabase Storage with validation and error handling
 */

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Validate file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file size (2MB limit)
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File size must be less than 2MB' };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File must be an image (JPEG, PNG, SVG, or WebP)' };
  }

  return { valid: true };
}

/**
 * Upload tenant logo to Supabase Storage
 */
export async function uploadTenantLogo(
  tenantId: string, 
  file: File
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${tenantId}-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    // Upload file
    const { error } = await supabase.storage
      .from('tenant-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('tenant-logos')
      .getPublicUrl(filePath);

    return { 
      success: true, 
      url: urlData.publicUrl 
    };

  } catch (error) {
    console.error('Upload service error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

/**
 * Delete tenant logo from storage
 */
export async function deleteTenantLogo(logoUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract file path from URL
    const url = new URL(logoUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(-2).join('/'); // Should be "logos/filename"

    const { error } = await supabase.storage
      .from('tenant-logos')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error) {
    console.error('Delete service error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Delete failed' 
    };
  }
}

/**
 * Update tenant logo URL in database
 */
export async function updateTenantLogoUrl(tenantId: string, logoUrl: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current settings
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    // Update settings with new logo URL
    const currentSettings = tenant.settings || {};
    const updatedSettings = {
      ...currentSettings,
      logo_url: logoUrl
    };

    const { error } = await supabase
      .from('tenants')
      .update({ settings: updatedSettings })
      .eq('id', tenantId);

    if (error) {
      console.error('Database update error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error) {
    console.error('Update service error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database update failed' 
    };
  }
}
