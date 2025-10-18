import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Info, CheckCircle, Smartphone, Shield } from 'lucide-react';
import { supabase } from '../../../lib/api/supabase';
import { parseAuthError } from '../../../utils/authErrorParser';
import { useAuth } from '../../../hooks/useAuth';
import { NetlifySecurityDiagnostics } from './NetlifySecurityDiagnostics';

/**
 * Security Settings Component
 * 
 * Allows users to manage their security settings including:
 * - Password changes with strength validation
 * - Security status overview
 * - Future MFA options
 */
export const SecuritySettings: React.FC = () => {
  const { user } = useAuth();
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  
  /**
   * Check password strength
   * Evaluates password against security criteria
   */
  const checkPasswordStrength = (password: string) => {
    const hasMinLength = password.length >= 10;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
    
    // Calculate score (0-4)
    let score = 0;
    if (hasMinLength) score++;
    if (hasUppercase && hasLowercase) score++;
    if (hasNumber) score++;
    if (hasSpecialChar) score++;
    
    setPasswordStrength({
      score,
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecialChar
    });
  };
  
  /**
   * Get color for password strength indicator
   */
  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0: return 'bg-gray-300 dark:bg-gray-600';
      case 1: return 'bg-red-500';
      case 2: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-green-500';
      default: return 'bg-gray-300 dark:bg-gray-600';
    }
  };
  
  /**
   * Get label for password strength
   */
  const getStrengthLabel = (score: number) => {
    switch (score) {
      case 0: return 'Very Weak';
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      default: return 'Very Weak';
    }
  };
  
  /**
   * Handle password change form submission
   */
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset status messages
    setError('');
    setSuccess('');
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordStrength.score < 3) {
      setError('Please use a stronger password');
      return;
    }
    
    setLoading(true);
    
    try {
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      }
      
      // Clear form and show success message
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully');
    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Settings</h1>
      </div>
      
      {/* Password Change Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-green-700 dark:text-green-300 text-sm">{success}</p>
          </div>
        )}
        
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  checkPasswordStrength(e.target.value);
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
                placeholder="Enter your new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
                      style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {getStrengthLabel(passwordStrength.score)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center space-x-1 ${passwordStrength.hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3" />
                    <span>At least 10 characters</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${passwordStrength.hasUppercase && passwordStrength.hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3" />
                    <span>Upper & lowercase</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${passwordStrength.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3" />
                    <span>At least one number</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${passwordStrength.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3" />
                    <span>Special character</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Confirm your new password"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || passwordStrength.score < 3}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>
      
      {/* Security Recommendations */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <p className="text-blue-800 dark:text-blue-300 font-medium text-sm">Security Recommendations</p>
        </div>
        <div className="text-blue-700 dark:text-blue-400 text-sm space-y-1">
          <p>• Use a unique password that you don't use for other accounts</p>
          <p>• Include a mix of uppercase, lowercase, numbers, and special characters</p>
          <p>• Avoid using personal information like names, birthdays, or addresses</p>
          <p>• Consider using a password manager to generate and store strong passwords</p>
          <p>• Change your password if you suspect it may have been compromised</p>
        </div>
      </div>
      
      {/* Account Security Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <Lock className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Security Status</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">Password Protection</p>
                <p className="text-xs text-green-600 dark:text-green-400">Your password is protected against known breaches</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Smartphone className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-300">Multi-Factor Authentication</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Additional security layer for your account</p>
              </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Available Soon</span>
          </div>
        </div>
      </div>

      {/* Security Diagnostics */}
      <div className="mt-8">
        <NetlifySecurityDiagnostics />
      </div>
    </div>
  );
};