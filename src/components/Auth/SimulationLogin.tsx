import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, AlertCircle, Users, Monitor } from 'lucide-react';
import { SimulationSubTenantService } from '../../lib/simulationSubTenantService';

const SimulationLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const simulationId = searchParams.get('simulation');
  const simulationName = searchParams.get('name') || 'Simulation Environment';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🎯 Attempting simulation login for:', username);
      console.log('🔍 Simulation ID from URL:', simulationId);
      console.log('🔍 Simulation name from URL:', simulationName);
      
      const result = await SimulationSubTenantService.authenticateSimulationUser(
        username.trim(),
        password.trim(),
        simulationId || undefined
      );

      if (result.success && result.user) {
        console.log('✅ Simulation login successful');
        
        // Store simulation session data
        sessionStorage.setItem('simulation_user', JSON.stringify({
          user_id: result.user.user_id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role,
          tenant_id: result.user.tenant_id,
          tenant_name: result.user.tenant_name,
          simulation_id: result.user.simulation_id,
          is_simulation_user: true,
          login_time: new Date().toISOString()
        }));

        // Redirect to simulation dashboard
        navigate('/simulation-dashboard');
      } else {
        setError(result.error || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Simulation login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Monitor className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Simulation Login</h1>
          <p className="text-gray-600">{simulationName}</p>
          {simulationId && (
            <p className="text-sm text-gray-500 mt-1">Session ID: {simulationId.slice(0, 8)}...</p>
          )}
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your username"
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </div>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Users className="h-4 w-4 mr-1" />
              Use the credentials provided by your instructor
            </div>
            <p className="text-xs text-gray-400 mt-2">
              This is a simulation environment for educational purposes
            </p>
          </div>
        </div>

        {/* Back to Main Login */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            ← Back to main login
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulationLogin;