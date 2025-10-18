import React, { useState, useRef } from 'react';
import { Upload, X, Image, AlertCircle, Check } from 'lucide-react';
import { uploadTenantLogo, deleteTenantLogo, updateTenantLogoUrl, validateImageFile } from '../../../../services/operations/fileUploadService';
import { Tenant } from '../../../../types';

interface LogoUploadProps {
  tenant: Tenant;
  onLogoUpdated: (logoUrl: string | null) => void;
  className?: string;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({ 
  tenant, 
  onLogoUpdated, 
  className = '' 
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentLogoUrl = tenant.settings?.logo_url as string | undefined;

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleFileUpload = async (file: File) => {
    clearMessages();
    setUploading(true);

    try {
      // Validate file first
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      // Upload to storage
      const uploadResult = await uploadTenantLogo(tenant.id, file);
      if (!uploadResult.success) {
        setError(uploadResult.error || 'Upload failed');
        return;
      }

      // Update database
      const updateResult = await updateTenantLogoUrl(tenant.id, uploadResult.url!);
      if (!updateResult.success) {
        setError(updateResult.error || 'Database update failed');
        return;
      }

      // Success!
      setSuccess('Logo uploaded successfully!');
      onLogoUpdated(uploadResult.url!);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentLogoUrl) return;

    clearMessages();
    setUploading(true);

    try {
      // Delete from storage
      const deleteResult = await deleteTenantLogo(currentLogoUrl);
      if (!deleteResult.success) {
        setError(deleteResult.error || 'Failed to delete logo');
        return;
      }

      // Update database
      const updateResult = await updateTenantLogoUrl(tenant.id, null);
      if (!updateResult.success) {
        setError(updateResult.error || 'Database update failed');
        return;
      }

      // Success!
      setSuccess('Logo removed successfully!');
      onLogoUpdated(null);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Remove failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Tenant Logo</h3>
        {currentLogoUrl && (
          <button
            onClick={handleRemoveLogo}
            disabled={uploading}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            <span>Remove Logo</span>
          </button>
        )}
      </div>

      {/* Current Logo Preview */}
      {currentLogoUrl && (
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <img
            src={currentLogoUrl}
            alt="Current logo"
            className="h-16 w-16 object-contain rounded"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Current Logo</p>
            <p className="text-xs text-gray-500 truncate max-w-xs">{currentLogoUrl}</p>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="space-y-2">
          <Image className="mx-auto h-12 w-12 text-gray-400" />
          <div>
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={uploading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              <span>{uploading ? 'Uploading...' : 'Upload Logo'}</span>
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Drag and drop or click to upload<br />
            Supports JPEG, PNG, SVG, WebP (max 2MB)
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
    </div>
  );
};
