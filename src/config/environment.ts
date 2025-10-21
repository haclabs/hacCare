/**
 * Environment Configuration Validation
 * 
 * Validates and provides typed access to environment variables
 * with appropriate fallbacks and security checks.
 */

interface EnvironmentConfig {
  // Supabase Configuration
  supabase: {
    url: string;
    anonKey: string;
    configured: boolean;
  };
  
  // Application Configuration
  app: {
    name: string;
    version: string;
    environment: 'development' | 'production' | 'test';
    debug: boolean;
  };

  // Security Configuration
  security: {
    enableCSP: boolean;
    enableRateLimit: boolean;
    sessionTimeout: number;
  };
}

/**
 * Validate and parse environment variables
 */
const validateEnvironment = (): EnvironmentConfig => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  
  // Validate Supabase configuration
  const isValidUrl = supabaseUrl && (
    supabaseUrl.startsWith('https://') && 
    supabaseUrl.includes('.supabase.co') &&
    supabaseUrl.length > 30
  );
  
  // Support both legacy JWT keys and new sb_publishable_ format
  const isValidKey = supabaseAnonKey && 
    supabaseAnonKey.length > 30 && 
    (
      // New format: sb_publishable_xxx or sb_xxx
      supabaseAnonKey.startsWith('sb_') ||
      // Legacy format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      /^[A-Za-z0-9._-]+$/.test(supabaseAnonKey)
    );

  const supabaseConfigured = isValidUrl && isValidKey;

  // Environment detection
  const isDev = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;
  const isTest = import.meta.env.MODE === 'test';

  let environment: 'development' | 'production' | 'test' = 'development';
  if (isProd) environment = 'production';
  if (isTest) environment = 'test';

  // Security settings based on environment
  const enableCSP = isProd;
  const enableRateLimit = isProd;
  const sessionTimeout = isProd ? 30 * 60 * 1000 : 60 * 60 * 1000; // 30min prod, 1hr dev

  return {
    supabase: {
      url: supabaseUrl || '',
      anonKey: supabaseAnonKey || '',
      configured: supabaseConfigured,
    },
    app: {
      name: 'hacCare',
      version: '1.0.0',
      environment,
      debug: isDev,
    },
    security: {
      enableCSP,
      enableRateLimit,
      sessionTimeout,
    },
  };
};

/**
 * Environment configuration singleton
 */
export const ENV = validateEnvironment();

/**
 * Runtime environment checks
 */
export const EnvChecks = {
  isProduction: () => ENV.app.environment === 'production',
  isDevelopment: () => ENV.app.environment === 'development',
  isTest: () => ENV.app.environment === 'test',
  isSupabaseConfigured: () => ENV.supabase.configured,
  canLog: (level: 'debug' | 'info' | 'warn' | 'error') => {
    if (level === 'error') return true;
    if (level === 'warn') return true;
    if (level === 'info' && !ENV.app.debug) return false;
    if (level === 'debug' && !ENV.app.debug) return false;
    return true;
  },
} as const;

/**
 * Safe console logging that respects environment
 */
export const SafeLog = {
  debug: (...args: any[]) => {
    if (EnvChecks.canLog('debug')) {
      console.debug('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (EnvChecks.canLog('info')) {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (EnvChecks.canLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (EnvChecks.canLog('error')) {
      console.error('[ERROR]', ...args);
    }
  },
} as const;
