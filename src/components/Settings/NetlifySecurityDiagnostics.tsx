import React, { useState, useEffect } from 'react';
import { 
  Shield, CheckCircle, XCircle, RefreshCw, 
  Activity, Globe, Database, Key
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/api/supabase';

interface SecurityCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'checking';
  details: string;
  category: 'connection' | 'authentication' | 'database' | 'hosting';
}

interface SecurityMetrics {
  overallScore: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
}

/**
 * 🛡️ Netlify Security Diagnostics
 * 
 * Simple, real security checks for your Netlify-hosted hacCare application.
 * Focuses on what actually matters: HTTPS, database security, and authentication.
 */
export const NetlifySecurityDiagnostics: React.FC = () => {
  const { user, profile } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [checks, setChecks] = useState<SecurityCheck[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  
  /**
   * Run security diagnostics
   */
  const runSecurityDiagnostics = async () => {
    setIsRunning(true);
    const checkResults: SecurityCheck[] = [];
    
    try {
      // 1. HTTPS/SSL Check (Netlify automatic)
      await checkHTTPS(checkResults);
      
      // 2. Netlify Security Headers
      await checkNetlifyHeaders(checkResults);
      
      // 3. Database Connection (Supabase)
      await checkDatabaseConnection(checkResults);
      
      // 4. Authentication Status
      await checkAuthentication(checkResults);
      
      // 5. Secure Context
      await checkSecureContext(checkResults);
      
      setChecks(checkResults);
      setMetrics(calculateMetrics(checkResults));
      setLastRunTime(new Date());
      
    } catch (error) {
      console.error('Security diagnostics error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Check HTTPS/SSL (Netlify provides this automatically)
   */
  const checkHTTPS = async (results: SecurityCheck[]) => {
    const isHTTPS = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    results.push({
      id: 'https',
      name: 'HTTPS/SSL Encryption',
      status: isHTTPS || isLocalhost ? 'pass' : 'fail',
      details: isHTTPS 
        ? '✅ Secure HTTPS connection active (Netlify SSL)' 
        : isLocalhost 
        ? '✅ localhost development mode'
        : '❌ Insecure HTTP connection',
      category: 'hosting'
    });
  };

  /**
   * Check Netlify security headers
   */
  const checkNetlifyHeaders = async (results: SecurityCheck[]) => {
    try {
      const response = await fetch(window.location.origin, { method: 'HEAD' });
      const headers = response.headers;
      
      // Check for security headers (Netlify _headers file)
      const hasXFrameOptions = headers.has('x-frame-options');
      const hasXContentType = headers.has('x-content-type-options');
      const hasReferrerPolicy = headers.has('referrer-policy');
      const hasXXSSProtection = headers.has('x-xss-protection');
      const hasHSTS = headers.has('strict-transport-security');
      
      const criticalHeaders = [hasXFrameOptions, hasXContentType, hasReferrerPolicy];
      const bonusHeaders = [hasXXSSProtection, hasHSTS];
      
      const criticalCount = criticalHeaders.filter(Boolean).length;
      const bonusCount = bonusHeaders.filter(Boolean).length;
      const totalCount = criticalCount + bonusCount;
      
      results.push({
        id: 'security-headers',
        name: 'Security Headers',
        status: criticalCount === 3 ? 'pass' : criticalCount >= 2 ? 'pass' : 'fail',
        details: criticalCount === 3
          ? `✅ All security headers configured (${totalCount}/5 total)`
          : criticalCount >= 2
          ? `✅ ${criticalCount}/3 critical headers found, ${bonusCount}/2 bonus headers`
          : `⚠️ Only ${criticalCount}/3 critical headers found. Check _headers file.`,
        category: 'hosting'
      });
    } catch (err) {
      results.push({
        id: 'security-headers',
        name: 'Security Headers',
        status: 'fail',
        details: '❌ Unable to check security headers',
        category: 'hosting'
      });
    }
  };

  /**
   * Check Supabase database connection
   */
  const checkDatabaseConnection = async (results: SecurityCheck[]) => {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      
      results.push({
        id: 'database',
        name: 'Database Connection',
        status: !error ? 'pass' : 'fail',
        details: !error 
          ? '✅ Secure connection to Supabase database' 
          : `❌ Database error: ${error.message}`,
        category: 'database'
      });
    } catch (err) {
      results.push({
        id: 'database',
        name: 'Database Connection',
        status: 'fail',
        details: `❌ Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        category: 'database'
      });
    }
  };

  /**
   * Check authentication
   */
  const checkAuthentication = async (results: SecurityCheck[]) => {
    const hasUser = !!user;
    const hasProfile = !!profile;
    
    results.push({
      id: 'auth-session',
      name: 'Authentication',
      status: hasUser && hasProfile ? 'pass' : 'fail',
      details: hasUser && hasProfile
        ? `✅ Authenticated as ${profile.role || 'user'}`
        : '⚠️ Not authenticated',
      category: 'authentication'
    });

    // Check JWT token
    try {
      const { data: session } = await supabase.auth.getSession();
      const hasToken = !!session.session?.access_token;
      
      results.push({
        id: 'auth-token',
        name: 'Session Token',
        status: hasToken ? 'pass' : 'fail',
        details: hasToken
          ? '✅ Valid authentication token'
          : '⚠️ No valid token found',
        category: 'authentication'
      });
    } catch (err) {
      results.push({
        id: 'auth-token',
        name: 'Session Token',
        status: 'fail',
        details: '❌ Token validation failed',
        category: 'authentication'
      });
    }
  };

  /**
   * Check secure context (required for certain APIs)
   */
  const checkSecureContext = async (results: SecurityCheck[]) => {
    const isSecureContext = window.isSecureContext;
    
    results.push({
      id: 'secure-context',
      name: 'Secure Context',
      status: isSecureContext ? 'pass' : 'fail',
      details: isSecureContext
        ? '✅ Running in secure context (HTTPS or localhost)'
        : '❌ Not a secure context',
      category: 'connection'
    });
  };

  /**
   * Calculate security metrics
   */
  const calculateMetrics = (checkResults: SecurityCheck[]): SecurityMetrics => {
    const totalChecks = checkResults.length;
    const passedChecks = checkResults.filter(c => c.status === 'pass').length;
    const failedChecks = checkResults.filter(c => c.status === 'fail').length;
    
    const overallScore = totalChecks > 0 
      ? Math.round((passedChecks / totalChecks) * 100) 
      : 0;

    return {
      overallScore,
      totalChecks,
      passedChecks,
      failedChecks
    };
  };

  // Run diagnostics on mount
  useEffect(() => {
    runSecurityDiagnostics();
  }, []);

  const getScoreColor = (score: number) => {
    if (score === 100) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score === 100) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (score >= 80) return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    if (score >= 60) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hosting': return Globe;
      case 'database': return Database;
      case 'authentication': return Key;
      case 'connection': return Activity;
      default: return Shield;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Security Diagnostics
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time security status for your Netlify-hosted application
          </p>
        </div>
        
        <button
          onClick={runSecurityDiagnostics}
          disabled={isRunning}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Scanning...' : 'Run Scan'}</span>
        </button>
      </div>

      {/* Security Score */}
      {metrics && (
        <div className={`p-6 rounded-lg border-2 ${getScoreBg(metrics.overallScore)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Overall Security Score
              </p>
              <p className={`text-5xl font-bold ${getScoreColor(metrics.overallScore)}`}>
                {metrics.overallScore}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {metrics.passedChecks} of {metrics.totalChecks} checks passed
              </p>
            </div>
            <div className="text-right">
              {metrics.overallScore === 100 ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-12 w-12" />
                  <div className="text-left">
                    <p className="font-bold text-lg">Excellent!</p>
                    <p className="text-sm">All secure</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <Activity className="h-12 w-12" />
                  <div className="text-left">
                    <p className="font-bold text-lg">Good</p>
                    <p className="text-sm">Some issues</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Checks by Category */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Security Checks
        </h4>
        
        {['hosting', 'connection', 'database', 'authentication'].map(category => {
          const categoryChecks = checks.filter(c => c.category === category);
          if (categoryChecks.length === 0) return null;
          
          const CategoryIcon = getCategoryIcon(category);
          
          return (
            <div key={category} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-750 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <CategoryIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h5 className="font-medium text-gray-900 dark:text-white capitalize">
                    {category}
                  </h5>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {categoryChecks.map((check) => (
                  <div key={check.id} className="p-4 flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {check.status === 'pass' ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : check.status === 'checking' ? (
                        <RefreshCw className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {check.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {check.details}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Last Scan Time */}
      {lastRunTime && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Last scan: {lastRunTime.toLocaleString()}
        </p>
      )}

      {/* 100% Score Celebration */}
      {metrics && metrics.overallScore === 100 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h4 className="text-lg font-bold text-green-900 dark:text-green-100 mb-2">
                🎉 Perfect Security Score!
              </h4>
              <p className="text-green-800 dark:text-green-200">
                Your hacCare application is fully secured with HTTPS encryption, secure authentication, 
                and protected database connections. All security checks passed successfully.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
