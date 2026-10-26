import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, Search, UserX, RotateCcw, Monitor, Tag, Mail, Layers, GraduationCap } from 'lucide-react';
import { supabase, UserProfile, UserRole } from '../../../../lib/api/supabase';
import { useAuth } from '../../../../hooks/useAuth';
import { getUserPrograms } from '../../../../services/admin/programService';
import { inviteUser } from '../../../../services/admin/inviteUserService';
import { getUserAuthStatus, UserAuthStatus } from '../../../../services/admin/userAuthStatusService';
import { getUserInstitutions, UserInstitution } from '../../../../services/admin/userInstitutionService';
import { UserForm } from './UserForm';
import { secureLogger } from '../../../../lib/security/secureLogger';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterSimOnly, setFilterSimOnly] = useState(false);
  const [userPrograms, setUserPrograms] = useState<Record<string, string[]>>({});
  const [groupByProgram, setGroupByProgram] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [sendingWelcome, setSendingWelcome] = useState(false);
  const [authStatus, setAuthStatus] = useState<Record<string, UserAuthStatus>>({});
  const [filterPendingSetup, setFilterPendingSetup] = useState(false);
  // Student accounts are temporary simulation logins, so they're hidden unless asked for
  const [showStudents, setShowStudents] = useState(false);
  const [userInstitutions, setUserInstitutions] = useState<Record<string, UserInstitution[]>>({});
  const { hasRole } = useAuth();
  const canSendWelcomeEmail = hasRole(['admin', 'coordinator', 'super_admin']);
  const canManageUsers = hasRole(['super_admin', 'coordinator', 'admin']);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        secureLogger.error('Error fetching users', error);
      } else {
        secureLogger.debug('Fetched users', { count: data?.length || 0 });
        setUsers(data || []);
        
        // Fetch programs for instructors and coordinators
        const programsMap: Record<string, string[]> = {};
        for (const user of data || []) {
          if (user.role === 'instructor' || user.role === 'coordinator') {
            const { data: programs } = await getUserPrograms(user.id);
            if (programs && programs.length > 0) {
              programsMap[user.id] = programs.map(p => p.program?.code || '').filter(Boolean);
            }
          }
        }
        setUserPrograms(programsMap);

        // Last sign-in / email confirmation status, so pending accounts can be spotted
        if (canSendWelcomeEmail && data && data.length > 0) {
          const ids = data.map(u => u.id);
          const [{ data: statusMap }, { data: institutionMap }] = await Promise.all([
            getUserAuthStatus(ids),
            getUserInstitutions(ids),
          ]);
          if (statusMap) setAuthStatus(statusMap);
          if (institutionMap) setUserInstitutions(institutionMap);
        }
      }
    } catch (error) {
      secureLogger.error('Error fetching users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user? They will be disabled but their data will remain.')) return;

    try {
      const { error } = await supabase.rpc('deactivate_user', { 
        target_user_id: userId 
      });
      
      if (error) {
        secureLogger.error('Error deactivating user', error);
        alert('Error deactivating user: ' + error.message);
      } else {
        alert('User deactivated successfully');
        await fetchUsers();
      }
    } catch (error) {
      secureLogger.error('Error deactivating user', error);
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
        secureLogger.error('Error deleting user permanently', error);
        alert('Error deleting user: ' + error.message);
      } else {
        alert('User permanently deleted');
        await fetchUsers();
      }
    } catch (error) {
      secureLogger.error('Error deleting user permanently', error);
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
        secureLogger.error('Error reactivating user', error);
        alert('Error reactivating user: ' + error.message);
      } else {
        alert('User reactivated successfully');
        await fetchUsers();
      }
    } catch (error) {
      secureLogger.error('Error reactivating user', error);
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

  // All unique program codes across all users (for filter dropdown)
  const allProgramCodes = [...new Set(
    Object.values(userPrograms).flat()
  )].sort();

  const hiddenStudentCount = showStudents ? 0 : users.filter(u => u.role === 'student').length;

  const filteredUsers = users.filter(user => {
    if (!showStudents && user.role === 'student') return false;

    // Search filter
    const term = searchTerm.toLowerCase();
    const matchesSearch = user.first_name.toLowerCase().includes(term) ||
      user.last_name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term) ||
      (userInstitutions[user.id] || []).some(i => i.name.toLowerCase().includes(term));
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);

    // Program filter — match if user has the selected program code
    const matchesProgram = filterProgram === 'all' ||
      (userPrograms[user.id] || []).includes(filterProgram);

    // Simulation-only filter
    const matchesSimOnly = !filterSimOnly || !!user.simulation_only;

    // Pending setup filter — never signed in yet
    const matchesPending = !filterPendingSetup || !authStatus[user.id]?.lastSignInAt;

    return matchesSearch && matchesStatus && matchesProgram && matchesSimOnly && matchesPending;
  }).sort((a, b) =>
    a.first_name.localeCompare(b.first_name) || a.last_name.localeCompare(b.last_name)
  );

  // Grouped view — by program when toggled, otherwise by institution. A user appears under
  // every program/institution they belong to, plus a catch-all bucket for those with none.
  const groupByInstitution = !groupByProgram && canSendWelcomeEmail;
  const groupedUsers = (() => {
    if (!groupByProgram && !groupByInstitution) return [];
    const groups: Record<string, UserProfile[]> = {};
    const ungrouped: UserProfile[] = [];
    filteredUsers.forEach(user => {
      const keys = groupByProgram
        ? userPrograms[user.id] || []
        : (userInstitutions[user.id] || []).map(inst => inst.name);
      if (keys.length > 0) {
        keys.forEach(key => {
          (groups[key] = groups[key] || []).push(user);
        });
      } else {
        ungrouped.push(user);
      }
    });
    const groupList = Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .map(key => ({ label: key, groupUsers: groups[key] }));
    if (ungrouped.length > 0) {
      groupList.push({ label: groupByProgram ? 'No Program' : 'No Institution', groupUsers: ungrouped });
    }
    return groupList;
  })();

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const selectableIds = filteredUsers.filter(u => u.is_active).map(u => u.id);
    const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedUserIds.has(id));
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        selectableIds.forEach(id => next.delete(id));
      } else {
        selectableIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleSendWelcomeEmails = async () => {
    const targets = users.filter(u => selectedUserIds.has(u.id) && u.is_active);
    if (targets.length === 0) return;

    if (!confirm(
      `Send a "reset your password" email to ${targets.length} user${targets.length === 1 ? '' : 's'}?\n\n` +
      `They will need to click the link and set a new password before they can log in again.`
    )) {
      return;
    }

    setSendingWelcome(true);
    let succeeded = 0;
    const failed: string[] = [];

    for (const target of targets) {
      const { error } = await inviteUser({
        email: target.email,
        firstName: target.first_name,
        lastName: target.last_name,
      });
      if (error) {
        failed.push(`${target.email}: ${error}`);
      } else {
        succeeded++;
      }
    }

    setSendingWelcome(false);
    setSelectedUserIds(new Set());

    if (failed.length === 0) {
      alert(`Welcome email sent to ${succeeded} user${succeeded === 1 ? '' : 's'}.`);
    } else {
      alert(`Sent ${succeeded} email(s). ${failed.length} failed:\n${failed.join('\n')}`);
    }
  };

  const columnCount = 5 + (canSendWelcomeEmail ? 3 : 0) + (canManageUsers ? 1 : 0);

  const renderUserRow = (user: UserProfile) => (
    <tr key={user.id} className={`hover:bg-gray-50 ${!user.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
      {canSendWelcomeEmail && (
        <td className="px-4 py-4 whitespace-nowrap">
          <input
            type="checkbox"
            checked={selectedUserIds.has(user.id)}
            disabled={!user.is_active}
            onChange={() => toggleSelectUser(user.id)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
            title={user.is_active ? 'Select user' : 'Inactive users cannot be emailed'}
          />
        </td>
      )}
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
      {canSendWelcomeEmail && (
        <td className={`px-6 py-4 whitespace-nowrap text-sm ${user.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
          {userInstitutions[user.id]?.length ? (
            <div className="flex flex-col gap-0.5">
              {userInstitutions[user.id].map(inst => (
                <span key={inst.id}>{inst.name}</span>
              ))}
            </div>
          ) : '-'}
        </td>
      )}
      <td className={`px-6 py-4 whitespace-nowrap text-sm ${user.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
        {(user.role === 'instructor' || user.role === 'coordinator') && userPrograms[user.id]?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {userPrograms[user.id].map(code => (
              <span key={code} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                <Tag className="h-3 w-3 mr-1" />
                {code}
              </span>
            ))}
          </div>
        ) : '-'}
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
      {canSendWelcomeEmail && (
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          {authStatus[user.id]?.lastSignInAt ? (
            <span className="text-gray-500">{new Date(authStatus[user.id].lastSignInAt as string).toLocaleDateString()}</span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
              Never signed in
            </span>
          )}
        </td>
      )}
      {canManageUsers && (
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
  );

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
        {canManageUsers && (
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
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status */}
            <div className="w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Program filter */}
            {allProgramCodes.length > 0 && (
              <div className="w-40">
                <select
                  value={filterProgram}
                  onChange={(e) => setFilterProgram(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Programs</option>
                  {allProgramCodes.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sim-only toggle chip */}
            <button
              onClick={() => setFilterSimOnly(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                filterSimOnly
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title="Show simulation-only users"
            >
              <Monitor className="h-4 w-4" />
              Sim Only
            </button>

            {/* Students toggle chip — student accounts are hidden by default */}
            <button
              onClick={() => setShowStudents(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showStudents
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title={showStudents ? 'Hide student accounts' : 'Show student accounts'}
            >
              <GraduationCap className="h-4 w-4" />
              Show Students
            </button>

            {/* Group by program toggle chip */}
            {allProgramCodes.length > 0 && (
              <button
                onClick={() => setGroupByProgram(v => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  groupByProgram
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Group users by program"
              >
                <Layers className="h-4 w-4" />
                Group by Program
              </button>
            )}

            {/* Pending setup toggle chip — users who have never signed in */}
            {canSendWelcomeEmail && (
              <button
                onClick={() => setFilterPendingSetup(v => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  filterPendingSetup
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Show users who haven't signed in yet"
              >
                <Mail className="h-4 w-4" />
                Pending Setup
              </button>
            )}
          </div>
          
          {/* Summary */}
          <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
            <span>
              Showing {filteredUsers.length} of {users.length} users
              {hiddenStudentCount > 0 && ` (${hiddenStudentCount} student${hiddenStudentCount === 1 ? '' : 's'} hidden)`}
            </span>
            {(filterProgram !== 'all' || filterSimOnly || filterPendingSetup || statusFilter !== 'all' || showStudents) && (
              <button
                onClick={() => { setFilterProgram('all'); setFilterSimOnly(false); setFilterPendingSetup(false); setStatusFilter('all'); setSearchTerm(''); setShowStudents(false); }}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
            {canSendWelcomeEmail && selectedUserIds.size > 0 && (
              <button
                onClick={handleSendWelcomeEmails}
                disabled={sendingWelcome}
                className="ml-auto inline-flex items-center gap-1.5 bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Mail className="h-4 w-4" />
                {sendingWelcome ? 'Sending...' : `Send Welcome Email (${selectedUserIds.size})`}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {canSendWelcomeEmail && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filteredUsers.some(u => u.is_active) && filteredUsers.filter(u => u.is_active).every(u => selectedUserIds.has(u.id))}
                      onChange={toggleSelectAllVisible}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      title="Select all active users shown"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                {canSendWelcomeEmail && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Institution
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Programs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                {canSendWelcomeEmail && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Sign In
                  </th>
                )}
                {canManageUsers && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedUsers.length > 0 ? (
                groupedUsers.map(group => (
                  <React.Fragment key={group.label}>
                    <tr className="bg-gray-100">
                      <td colSpan={columnCount} className="px-6 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        {group.label} <span className="font-normal normal-case text-gray-400">({group.groupUsers.length})</span>
                      </td>
                    </tr>
                    {group.groupUsers.map(renderUserRow)}
                  </React.Fragment>
                ))
              ) : (
                filteredUsers.map(renderUserRow)
              )}
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
          onSuccess={async () => {
            setShowForm(false);
            setSelectedUser(null);
            // Small delay to ensure database changes propagate
            await new Promise(resolve => setTimeout(resolve, 500));
            await fetchUsers();
          }}
        />
      )}
    </div>
  );
};

// Add default export for lazy loading
export default UserManagement;