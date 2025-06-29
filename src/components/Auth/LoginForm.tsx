import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Info, Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      setError('Database connection not configured. Please set up Supabase.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        // Provide more user-friendly error messages
        if (error.message?.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message?.includes('Email not confirmed')) {
          setError('Please confirm your email address before signing in.');
        } else if (error.message?.includes('Too many requests')) {
          setError('Too many login attempts. Please wait a moment before trying again.');
        } else if (error.message?.includes('Network error') || error.message?.includes('Failed to fetch')) {
          setError('Network connection error. Please check your internet connection and try again.');
        } else {
          setError(error.message || 'An error occurred during sign in. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(demoEmail, demoPassword);
      
      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          setError('Demo account not found. Please ensure the demo accounts have been set up in your Supabase project.');
        } else {
          setError(error.message || 'Failed to sign in with demo account.');
        }
      }
    } catch (error: any) {
      console.error('Demo login error:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          {/* Custom HacCare Logo with Heart */}
          <div className="flex justify-center items-center mb-1">
            <div className="flex items-center space-x-3">
              {/* Heart Icon */}
              <div className="relative">
                <Heart 
                  className="h-20 w-20 text-blue-600 fill-current" 
                  strokeWidth={1.5}
                />
                {/* Heartbeat line overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg 
                    className="h-8 w-8 text-white" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M3 12h3l2-4 4 8 2-4h3" />
                  </svg>
                </div>
              </div>
              
              {/* HacCare Text */}
              <div className="text-left">
                <h1 className="text-4xl font-bold text-gray-800 leading-none">
                  haccare
                </h1>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  patient record system
                </p>
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-2">Secure Portal Access</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-yellow-800 text-sm font-medium">Database Not Connected</p>
                <p className="text-yellow-700 text-xs mt-1">
                  Please click "Connect to Supabase" in the top right to set up the database connection.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!isSupabaseConfigured}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!isSupabaseConfigured}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={!isSupabaseConfigured}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {isSupabaseConfigured && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Info className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-medium text-blue-900">Demo Accounts</h3>
              </div>
              <div className="space-y-3">
                <div className="text-xs text-blue-700">
                  <p className="mb-1"><strong>Super Admin:</strong> admin@haccare.com</p>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('admin@haccare.com', 'admin123')}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-800 underline text-xs disabled:opacity-50"
                  >
                    Click to login as Admin
                  </button>
                </div>
                <div className="text-xs text-blue-700">
                  <p className="mb-1"><strong>Nurse:</strong> nurse@haccare.com</p>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('nurse@haccare.com', 'nurse123')}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-800 underline text-xs disabled:opacity-50"
                  >
                    Click to login as Nurse
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-600">
                  <strong>Testing:</strong> Use these demo accounts to explore the system.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};