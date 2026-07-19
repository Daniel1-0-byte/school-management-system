/**
 * Environment variable validation
 * Ensures all required environment variables are set at runtime
 */

export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value && typeof window === 'undefined') {
    // Only throw at build time for non-public env vars
    if (!key.startsWith('NEXT_PUBLIC_')) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  return value || '';
}

export function getOptionalEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

// Supabase configuration - only validate at runtime
const getSUPABASE_URL = (): string => {
  const val = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!val && typeof window !== 'undefined') {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }
  return val;
};

const getSUPABASE_ANON_KEY = (): string => {
  const val = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!val && typeof window !== 'undefined') {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return val;
};

export const SUPABASE_URL = getSUPABASE_URL();
export const SUPABASE_ANON_KEY = getSUPABASE_ANON_KEY();
export const SUPABASE_SERVICE_ROLE_KEY = getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY', '');

// CAPTCHA configuration - optional at build time
export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
export const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '';

// Optional: Resend for custom transactional emails
export const RESEND_API_KEY = getOptionalEnv('RESEND_API_KEY');

// App configuration
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const isDevelopment = NODE_ENV === 'development';
export const isProduction = NODE_ENV === 'production';
