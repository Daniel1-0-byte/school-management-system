import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import crypto from 'crypto';

// Import otplib - modern v13+ API
let otplib: any = null;
try {
  otplib = require('otplib');
} catch (error) {
  console.error('[v0] Warning: otplib could not be loaded. TOTP 2FA will be unavailable.');
}

/**
 * Platform Admin Authentication - Server Only (Node.js)
 * Contains functions that require Node.js modules like crypto
 * WARNING: This module MUST NOT be imported from middleware or Edge Runtime code
 */

// ============================================================================
// SUPABASE CLIENT HELPER
// ============================================================================

/**
 * Get a Supabase client with service role key
 * Returns null if credentials are not available
 */
function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// ============================================================================
// PASSWORD HASHING (Node-only)
// ============================================================================

/**
 * Hash a password using crypto.pbkdf2
 * Uses 100,000 iterations for security
 * NODE-ONLY: Uses Node.js crypto module
 */
export function hashPassword(password: string, salt?: Buffer): string {
  const saltBuffer = salt || crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, saltBuffer, 100000, 64, 'sha512');
  return `${saltBuffer.toString('hex')}.${hash.toString('hex')}`;
}

/**
 * Verify a password against a stored hash
 * NODE-ONLY: Uses Node.js crypto module
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [saltHex, hashHex] = hashedPassword.split('.');
  if (!saltHex || !hashHex) {
    return false;
  }

  try {
    const saltBuffer = Buffer.from(saltHex, 'hex');
    const expectedHash = crypto.pbkdf2Sync(password, saltBuffer, 100000, 64, 'sha512');
    const storedHash = Buffer.from(hashHex, 'hex');
    return crypto.timingSafeEqual(expectedHash, storedHash);
  } catch {
    return false;
  }
}

// ============================================================================
// TOTP MANAGEMENT (Node-only)
// ============================================================================

/**
 * Generate a new TOTP secret for the admin
 * NODE-ONLY: Requires otplib
 */
export function generateTOTPSecret(email: string): string {
  if (!otplib || !otplib.generateSecret) {
    throw new Error('[v0] CRITICAL: Cannot generate TOTP secret - otplib not available. Check Node.js version and dependencies.');
  }
  return otplib.generateSecret();
}

/**
 * Get the TOTP authentication URL for QR code generation
 * NODE-ONLY: Requires otplib
 */
export function getTOTPAuthUrl(email: string, secret: string): string {
  if (!otplib || !otplib.generateURI) {
    throw new Error('[v0] CRITICAL: Cannot generate TOTP URL - otplib not available. Check Node.js version and dependencies.');
  }
  return otplib.generateURI({
    label: `SchoolHub (${email})`,
    secret,
    issuer: 'SchoolHub',
  });
}

/**
 * Verify a TOTP code against a secret
 * NODE-ONLY: Requires otplib
 */
export function verifyTOTPCode(code: string, secret: string): boolean {
  if (!otplib || !otplib.verify) {
    console.error('[v0] CRITICAL: TOTP verification failed - otplib not available');
    return false;
  }
  try {
    return otplib.verify({ token: code, secret });
  } catch (error) {
    console.error('[v0] TOTP verification error:', error);
    return false;
  }
}

// ============================================================================
// SESSION MANAGEMENT (Node-only - uses crypto for tokens)
// ============================================================================

/**
 * Generate a random session token
 * NODE-ONLY: Uses crypto.randomBytes
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store session in the database
 * NODE-ONLY: Session creation happens in API routes
 */
export async function storeSession(
  adminId: string,
  token: string,
  expiresAt: Date
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('[v0] Missing Supabase configuration');
      return false;
    }

    const { error } = await supabase
      .from('platform_admin_sessions')
      .insert({
        admin_id: adminId,
        token: token,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[v0] Failed to store session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[v0] Session storage error:', error);
    return false;
  }
}

// ============================================================================
// 2FA SESSIONS (Node-only - uses crypto for session IDs)
// ============================================================================

/**
 * Create a temporary 2FA session
 * NODE-ONLY: Uses crypto.randomUUID for session IDs
 */
export async function create2FASession(
  adminId: string,
  expiresIn: number = 5 * 60 * 1000 // 5 minutes
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return null;
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expiresIn);

    const { error } = await supabase
      .from('platform_admin_2fa_sessions')
      .insert({
        id: sessionId,
        admin_id: adminId,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[v0] Failed to create 2FA session:', error);
      return null;
    }

    return sessionId;
  } catch (error) {
    console.error('[v0] 2FA session creation error:', error);
    return null;
  }
}

/**
 * Verify 2FA session exists and is not expired
 * NODE-ONLY: Part of server-side 2FA flow
 */
export async function verify2FASession(sessionId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from('platform_admin_2fa_sessions')
      .select('admin_id, expires_at')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if session has expired
    if (new Date(data.expires_at) < new Date()) {
      await supabase
        .from('platform_admin_2fa_sessions')
        .delete()
        .eq('id', sessionId);
      return null;
    }

    return data.admin_id;
  } catch (error) {
    console.error('[v0] 2FA session verification error:', error);
    return null;
  }
}

/**
 * Consume (delete) a 2FA session after successful verification
 * NODE-ONLY: Part of server-side 2FA flow
 */
export async function consume2FASession(sessionId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return false;
    }

    const { error } = await supabase
      .from('platform_admin_2fa_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('[v0] Failed to consume 2FA session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[v0] 2FA session consumption error:', error);
    return false;
  }
}
