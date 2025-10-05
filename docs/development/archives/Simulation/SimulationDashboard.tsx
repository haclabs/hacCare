import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Clock, Monitor, Users, Heart, Pill, FileText } from 'lucide-react';

interface SimulationUser {
  user_id: string;
  username: string;
  email: string;
  role: string;
  tenant_id: string;
  tenant_name: string;
  simulation_id: string;
  is_simulation_user: boolean;
  login_time: string;
}

const SimulationDashboard: React.FC = () => {
  const [user, setUser] = useState<SimulationUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for simulation user session
    const simulationUserData = sessionStorage.getItem('simulation_user');
    
    if (!simulationUserData) {
      // No simulation session, redirect to login
      navigate('/simulation-login');
      return;
    }

    try {
      const userData = JSON.parse(simulationUserData);
      setUser(userData);
    } catch (error) {
      console.error('Error parsing simulation user data:', error);
      navigate('/simulation-login');
      return;
    }

    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('simulation_user');
    navigate('/simulation-login');
  };

  const getLoginDuration = () => {
    if (!user?.login_time) return '';
    
    const loginTime = new Date(user.login_time);
    const now = new Date();
    const diffMs = now.getTime() - loginTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'instructor': return 'bg-purple-100 text-purple-800';
      case 'nurse': return 'bg-green-100 text-green-800';
      case 'student': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Monitor className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Simulation Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <p className="text-xs text-gray-500">{user.tenant_name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full mr-4">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{user.username}</h2>
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                  <span className="ml-3 text-sm text-gray-500 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Logged in {getLoginDuration()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simulation Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Simulation Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Simulation Name</label>
                <p className="text-gray-900">{user.tenant_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Session ID</label>
                <p className="text-gray-900 font-mono text-sm">{user.simulation_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Your Role</label>
                <p className="text-gray-900 capitalize">{user.role}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center p-3 text-center hover:bg-gray-50 rounded-lg border">
                <Users className="h-6 w-6 text-blue-600 mb-2" />
                <span className="text-sm font-medium">Patients</span>
              </button>
              <button className="flex flex-col items-center p-3 text-center hover:bg-gray-50 rounded-lg border">
                <Heart className="h-6 w-6 text-red-600 mb-2" />
                <span className="text-sm font-medium">Vitals</span>
              </button>
              <button className="flex flex-col items-center p-3 text-center hover:bg-gray-50 rounded-lg border">
                <Pill className="h-6 w-6 text-green-600 mb-2" />
                <span className="text-sm font-medium">Medications</span>
              </button>
              <button className="flex flex-col items-center p-3 text-center hover:bg-gray-50 rounded-lg border">
                <FileText className="h-6 w-6 text-purple-600 mb-2" />
                <span className="text-sm font-medium">Notes</span>
              </button>
            </div>
          </div>
        </div>

        {/* Role-specific Content */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {user.role === 'instructor' ? 'Instructor Controls' : 
             user.role === 'nurse' ? 'Nursing Tools' : 
             'Student Interface'}
          </h3>
          
          <div className="text-center py-8 text-gray-500">
            <Monitor className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Simulation interface coming soon...</p>
            <p className="text-sm mt-2">
              This dashboard will be enhanced with role-specific tools and interfaces.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationDashboard;