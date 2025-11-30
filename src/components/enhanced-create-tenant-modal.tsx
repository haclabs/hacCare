// Enhanced CreateTenantModal with email-based admin selection
// Replace the existing CreateTenantModal in ManagementDashboard.tsx with this version

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/api/supabase';
import { createTenant } from '../../services/admin/tenantService';

// Add this interface near the top of your file
interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
}

const CreateTenantModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    subscription_plan: 'basic' as 'basic' | 'premium' | 'enterprise',
    max_users: 10,
    max_patients: 100,
    admin_email: '', // Changed from admin_user_id to admin_email
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableAdmins, setAvailableAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Load available admins when component mounts
  useEffect(() => {
    loadAvailableAdmins();
  }, []);

  const loadAvailableAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const { data, error } = await supabase.rpc('get_available_admins');
      
      if (error) {
        console.error('Error loading available admins:', error);
        setError('Failed to load available admins');
      } else {
        setAvailableAdmins(data || []);
      }
    } catch (err) {
      console.error('Error loading available admins:', err);
      setError('Failed to load available admins');
    } finally {
      setLoadingAdmins(false);
    }
  };

  const findUserByEmail = async (email: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('find_user_by_email', { email_param: email });
      
      if (error || !data || data.length === 0) {
        return null;
      }
      
      return data[0].user_id;
    } catch (err) {
      console.error('Error finding user by email:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // First, find the user ID from the email
      const adminUserId = await findUserByEmail(formData.admin_email);
      if (!adminUserId) {
        setError('Admin user not found with the provided email');
        setLoading(false);
        return;
      }

      const tenantData = {
        ...formData,
        admin_user_id: adminUserId, // Convert email to user_id
        status: 'active' as const,
        settings: {
          timezone: 'UTC',
          date_format: 'MM/DD/YYYY',
          currency: 'USD',
        },
      };

      const { error } = await createTenant(tenantData);
      if (error) {
        throw new Error(error.message);
      }
      
      onSuccess();
    } catch (err) {
      console.error('Error creating tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Create New Tenant</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenant Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subdomain
            </label>
            <input
              type="text"
              value={formData.subdomain}
              onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Users
            </label>
            <input
              type="number"
              value={formData.max_users}
              onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Patients
            </label>
            <input
              type="number"
              value={formData.max_patients}
              onChange={(e) => setFormData({ ...formData, max_patients: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Plan
            </label>
            <select
              value={formData.subscription_plan}
              onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin User Email
            </label>
            {loadingAdmins ? (
              <div className="text-sm text-gray-500">Loading available admins...</div>
            ) : (
              <>
                <select
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Select an admin user</option>
                  {availableAdmins.map((admin) => (
                    <option key={admin.user_id} value={admin.email}>
                      {admin.full_name} ({admin.email}) - {admin.role}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-500 mt-1">
                  Or type email manually if not in list
                </div>
                <input
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  placeholder="Or enter email address"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2"
                />
              </>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
