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
 * 
 * Hash format MUST be: salt.hash
 * - salt: 16 bytes in hex (32 chars)
 * - hash: 64 bytes in hex (128 chars)
 * 
 * Uses timing-safe comparison to prevent timing attacks
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    // Validate hash format
    if (!hashedPassword || typeof hashedPassword !== 'string') {
      console.error('[v0] Password verification: hash is missing or not a string');
      return false;
    }

    const parts = hashedPassword.split('.');
    if (parts.length !== 2) {
      console.error('[v0] Password verification: hash format invalid - expected 2 parts separated by dot', {
        partsCount: parts.length,
        hashLength: hashedPassword.length
      });
      return false;
    }

    const [saltHex, hashHex] = parts;

    // Validate hex strings
    if (!saltHex || !hashHex) {
      console.error('[v0] Password verification: missing salt or hash part');
      return false;
    }

    if (!/^[a-f0-9]*$/.test(saltHex) || !/^[a-f0-9]*$/.test(hashHex)) {
      console.error('[v0] Password verification: hash parts contain invalid hex characters');
      return false;
    }

    // Decode and validate lengths
    const saltBuffer = Buffer.from(saltHex, 'hex');
    const storedHash = Buffer.from(hashHex, 'hex');

    if (saltBuffer.length !== 16) {
      console.error('[v0] Password verification: salt length incorrect', {
        expected: 16,
        actual: saltBuffer.length
      });
      return false;
    }

    if (storedHash.length !== 64) {
      console.error('[v0] Password verification: hash length incorrect', {
        expected: 64,
        actual: storedHash.length
      });
      return false;
    }

    // Compute hash with provided password
    const expectedHash = crypto.pbkdf2Sync(password, saltBuffer, 100000, 64, 'sha512');

    // Use timing-safe comparison to prevent timing attacks
    const matches = crypto.timingSafeEqual(expectedHash, storedHash);
    return matches;

  } catch (error) {
    console.error('[v0] Password verification exception:', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
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
      console.error('[v0] Session storage: Supabase client not available');
      return false;
    }

    if (!adminId || !token) {
      console.error('[v0] Session storage: missing required parameters', {
        hasAdminId: !!adminId,
        hasToken: !!token
      });
      return false;
    }

    const expiresAtIso = expiresAt.toISOString();
    const createdAtIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('platform_admin_sessions')
      .insert({
        admin_id: adminId,
        token: token,
        expires_at: expiresAtIso,
        created_at: createdAtIso,
      })
      .select();

    if (error) {
      console.error('[v0] Session storage: Supabase insert failed', {
        error: error.message,
        code: error.code
      });
      return false;
    }

    if (!data || data.length === 0) {
      console.error('[v0] Session storage: no rows returned after insert');
      return false;
    }

    console.log('[v0] Session storage: success', {
      adminId,
      expiresAt: expiresAtIso
    });
    return true;

  } catch (error) {
    console.error('[v0] Session storage: unexpected exception', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

// ============================================================================
// 2FA SESSIONS (Node-only - uses crypto for session IDs)
// ============================================================================

/**
 * Create a temporary 2FA session
 * NODE-ONLY: Uses crypto.randomUUID for session IDs
 * 
 * 2FA sessions expire after 5 minutes by default
 */
export async function create2FASession(
  adminId: string,
  expiresIn: number = 5 * 60 * 1000 // 5 minutes
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('[v0] 2FA session creation: Supabase client not available');
      return null;
    }

    if (!adminId) {
      console.error('[v0] 2FA session creation: missing adminId');
      return null;
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expiresIn);
    const createdAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('platform_admin_2fa_sessions')
      .insert({
        id: sessionId,
        admin_id: adminId,
        expires_at: expiresAt.toISOString(),
        created_at: createdAt,
      })
      .select();

    if (error) {
      console.error('[v0] 2FA session creation: Supabase insert failed', {
        error: error.message,
        code: error.code,
        adminId
      });
      return null;
    }

    if (!data || data.length === 0) {
      console.error('[v0] 2FA session creation: no rows returned after insert', { adminId });
      return null;
    }

    console.log('[v0] 2FA session creation: success', {
      sessionId,
      adminId,
      expiresIn
    });
    return sessionId;

  } catch (error) {
    console.error('[v0] 2FA session creation: unexpected exception', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Verify 2FA session exists and is not expired
 * NODE-ONLY: Part of server-side 2FA flow
 * 
 * Returns admin_id if session is valid, null otherwise
 * Automatically deletes expired sessions
 */
export async function verify2FASession(sessionId: string): Promise<string | null> {
  try {
    if (!sessionId) {
      console.error('[v0] 2FA session verification: missing sessionId');
      return null;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('[v0] 2FA session verification: Supabase client not available');
      return null;
    }

    const { data, error } = await supabase
      .from('platform_admin_2fa_sessions')
      .select('admin_id, expires_at')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('[v0] 2FA session verification: lookup failed', {
        error: error.message,
        code: error.code
      });
      return null;
    }

    if (!data) {
      console.error('[v0] 2FA session verification: session not found');
      return null;
    }

    // Check if session has expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);

    if (expiresAt < now) {
      console.log('[v0] 2FA session verification: session expired - cleaning up');
      
      const { error: deleteError } = await supabase
        .from('platform_admin_2fa_sessions')
        .delete()
        .eq('id', sessionId);

      if (deleteError) {
        console.error('[v0] 2FA session verification: failed to delete expired session', {
          error: deleteError.message
        });
      }

      return null;
    }

    console.log('[v0] 2FA session verification: success', {
      adminId: data.admin_id,
      expiresIn: Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
    });
    return data.admin_id;

  } catch (error) {
    console.error('[v0] 2FA session verification: unexpected exception', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Consume (delete) a 2FA session after successful verification
 * NODE-ONLY: Part of server-side 2FA flow
 * 
 * Ensures a 2FA session can only be used once
 */
export async function consume2FASession(sessionId: string): Promise<boolean> {
  try {
    if (!sessionId) {
      console.error('[v0] 2FA session consumption: missing sessionId');
      return false;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('[v0] 2FA session consumption: Supabase client not available');
      return false;
    }

    const { data, error } = await supabase
      .from('platform_admin_2fa_sessions')
      .delete()
      .eq('id', sessionId)
      .select();

    if (error) {
      console.error('[v0] 2FA session consumption: delete failed', {
        error: error.message,
        code: error.code
      });
      return false;
    }

    if (!data || data.length === 0) {
      console.error('[v0] 2FA session consumption: session not found (already consumed?)');
      return false;
    }

    console.log('[v0] 2FA session consumption: success');
    return true;

  } catch (error) {
    console.error('[v0] 2FA session consumption: unexpected exception', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}
