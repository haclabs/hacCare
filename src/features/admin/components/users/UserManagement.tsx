import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, Search, UserX, RotateCcw, Monitor } from 'lucide-react';
import { supabase, UserProfile, UserRole } from '../../../../lib/api/supabase';
import { useAuth } from '../../../../hooks/useAuth';
import { UserForm } from './UserForm';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const { hasRole } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user? They will be disabled but their data will remain.')) return;

    try {
      const { error } = await supabase.rpc('deactivate_user', { 
        target_user_id: userId 
      });
      
      if (error) {
        console.error('Error deactivating user:', error);
        alert('Error deactivating user: ' + error.message);
      } else {
        alert('User deactivated successfully');
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert('Error deactivating user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmMessage = 'Are you sure you want to PERMANENTLY DELETE this user?\n\n⚠️ WARNING: This will:\n- Delete the user completely\n- Remove all their data\n- Cannot be undone\n\nType "DELETE" to confirm:';
    const userInput = prompt(confirmMessage);
    
    if (userInput !== 'DELETE') {
      alert('User deletion cancelled');
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_user_permanently', { 
        target_user_id: userId 
      });
      
      if (error) {
        console.error('Error deleting user permanently:', error);
        alert('Error deleting user: ' + error.message);
      } else {
        alert('User permanently deleted');
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error deleting user permanently:', error);
      alert('Error deleting user');
    }
  };

  const handleReactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to reactivate this user?')) return;

    try {
      const { error } = await supabase.rpc('reactivate_user', { 
        target_user_id: userId 
      });
      
      if (error) {
        console.error('Error reactivating user:', error);
        alert('Error reactivating user: ' + error.message);
      } else {
        alert('User reactivated successfully');
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error reactivating user:', error);
      alert('Error reactivating user');
    }
  };


  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'nurse': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'nurse': return 'Nurse';
      default: return role;
    }
  };

  const filteredUsers = users.filter(user => {
    // Apply search filter
    const matchesSearch = user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply status filter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        </div>
        {hasRole(['admin', 'super_admin']) && (
          <button
            onClick={() => {
              setSelectedUser(null);
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Users</option>
                <option value="active">Active Users</option>
                <option value="inactive">Inactive Users</option>
              </select>
            </div>
          </div>
          
          {/* Summary */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
            {statusFilter !== 'all' && (
              <span className="ml-2">
                ({statusFilter === 'active' ? 'active only' : 'inactive only'})
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                {hasRole(['admin', 'super_admin']) && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-50 ${!user.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className={`text-sm font-medium ${user.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                        {user.first_name} {user.last_name}
                        {!user.is_active && (
                          <span className="ml-2 text-xs text-red-600 font-normal">(Inactive)</span>
                        )}
                        {user.simulation_only && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            <Monitor className="h-3 w-3 mr-1" />
                            Sim Only
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.license_number && (
                        <div className="text-xs text-gray-400">License: {user.license_number}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${user.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                    {user.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${user.is_active ? 'text-gray-500' : 'text-gray-400'}`}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  {hasRole(['admin', 'super_admin']) && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        {/* Deactivate/Reactivate Toggle */}
                        <button
                          onClick={() => user.is_active ? handleDeactivateUser(user.id) : handleReactivateUser(user.id)}
                          className={`p-1 rounded ${
                            user.is_active 
                              ? 'text-orange-600 hover:text-orange-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={user.is_active ? 'Deactivate User' : 'Reactivate User'}
                        >
                          {user.is_active ? <UserX className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                        </button>
                        
                        {/* Permanent Delete - Only for Super Admins */}
                        {hasRole('super_admin') && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Permanently Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {searchTerm ? (
              <div>
                <p className="text-gray-500 mb-2">No users found matching "{searchTerm}"</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Clear search
                </button>
              </div>
            ) : statusFilter === 'active' ? (
              <p className="text-gray-500">No active users found</p>
            ) : statusFilter === 'inactive' ? (
              <p className="text-gray-500">No inactive users found</p>
            ) : (
              <p className="text-gray-500">No users found</p>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <UserForm
          user={selectedUser}
          onClose={() => {
            setShowForm(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
};

// Add default export for lazy loading
export default UserManagement;