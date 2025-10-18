import React, { useState } from 'react';
import { Settings, Save, AlertCircle, Check } from 'lucide-react';
import { LogoUpload } from './LogoUpload';
import { useTenant } from '../../../../contexts/TenantContext';
import { updateTenant } from '../../../../services/admin/tenantService';

export const TenantSettings: React.FC = () => {
  const { currentTenant, refreshTenant } = useTenant();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: currentTenant?.name || '',
    primary_color: currentTenant?.settings?.primary_color || '#3B82F6',
    timezone: currentTenant?.settings?.timezone || 'UTC',
    currency: currentTenant?.settings?.currency || 'USD',
    date_format: currentTenant?.settings?.date_format || 'MM/DD/YYYY'
  });

  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Tenant Selected</h3>
          <p className="mt-1 text-sm text-gray-500">Please select a tenant to manage settings.</p>
        </div>
      </div>
    );
  }

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearMessages();
  };

  const handleSave = async () => {
    clearMessages();
    setSaving(true);

    try {
      // Prepare updated settings
      const updatedSettings = {
        ...currentTenant.settings,
        primary_color: formData.primary_color,
        timezone: formData.timezone,
        currency: formData.currency,
        date_format: formData.date_format
      };

      // Update tenant
      const { error: updateError } = await updateTenant(currentTenant.id, {
        name: formData.name,
        settings: updatedSettings
      });

      if (updateError) {
        setError(updateError.message || 'Failed to update tenant settings');
        return;
      }

      // Refresh tenant data
      await refreshTenant();
      setSuccess('Settings saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpdated = async () => {
    // Refresh tenant data to show updated logo
    await refreshTenant();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Settings className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Settings</h1>
          <p className="text-gray-600">Manage your organization's branding and preferences</p>
        </div>
      </div>

      {/* Logo Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <LogoUpload 
          tenant={currentTenant} 
          onLogoUpdated={handleLogoUpdated}
        />
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">General Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organization Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter organization name"
            />
          </div>

          {/* Primary Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => handleInputChange('primary_color', e.target.value)}
                className="h-10 w-20 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                value={formData.primary_color}
                onChange={(e) => handleInputChange('primary_color', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="America/Edmonton">Mountain Time (Canada)</option>
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>

          {/* Date Format */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <select
              value={formData.date_format}
              onChange={(e) => handleInputChange('date_format', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (International)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            </select>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-4 flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
