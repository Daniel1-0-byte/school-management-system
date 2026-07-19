/**
 * Platform Admin Authentication - Backward Compatibility Re-export
 * 
 * This file re-exports functions from the split modules:
 * - lib/platform-admin-auth.edge.ts: Edge Runtime safe functions
 * - lib/platform-admin-auth.server.ts: Node-only functions
 * 
 * Use specific imports for new code:
 * - import { verifySession } from '@/lib/platform-admin-auth.edge'
 * - import { verifyPassword } from '@/lib/platform-admin-auth.server'
 * 
 * This file is kept for backward compatibility only.
 */

// Re-export types (Edge-safe)
export type { PlatformAdminSession } from '@/lib/platform-admin-auth.types';

// Re-export Edge-safe functions
export { 
  verifySession,
  invalidateSession,
  cleanupExpiredSessions,
} from '@/lib/platform-admin-auth.edge';

// Re-export Server-only functions
export {
  hashPassword,
  verifyPassword,
  generateTOTPSecret,
  getTOTPAuthUrl,
  verifyTOTPCode,
  generateSessionToken,
  storeSession,
  create2FASession,
  verify2FASession,
  consume2FASession,
} from '@/lib/platform-admin-auth.server';
