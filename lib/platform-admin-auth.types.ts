/**
 * Platform Admin Authentication Types
 * Edge Runtime safe - no Node.js dependencies
 */

export interface PlatformAdminSession {
  adminId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  expiresAt: string;
}
