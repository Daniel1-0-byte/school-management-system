/**
 * Comprehensive debug logger for troubleshooting common issues in Vercel deployment
 * This logger provides structured logs with request IDs and timestamps for easy debugging
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
type LogCategory = 'EMAIL' | 'AUTH' | 'APPROVAL' | 'LOGIN' | 'SIGNUP' | 'SCHOOL' | 'CONFIG';

interface LogEntry {
  requestId: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: Record<string, any>;
  stack?: string;
}

// Generate unique request ID for tracing
export function generateRequestId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Format log entries consistently
function formatLogEntry(entry: LogEntry): string {
  const emoji = {
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '❌',
    DEBUG: '🔍',
  }[entry.level];

  const dataStr = entry.data ? `\n  Data: ${JSON.stringify(entry.data, null, 2)}` : '';
  const stackStr = entry.stack ? `\n  Stack: ${entry.stack}` : '';

  return `[v0][${entry.level}][${entry.category}][${entry.requestId}] ${emoji} ${entry.message}${dataStr}${stackStr}`;
}

// Main logger class
export class DebugLogger {
  private requestId: string;
  private category: LogCategory;

  constructor(category: LogCategory, requestId?: string) {
    this.category = category;
    this.requestId = requestId || generateRequestId(category);
  }

  private log(level: LogLevel, message: string, data?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      level,
      category: this.category,
      message,
      data,
      stack: error?.stack,
    };

    const formatted = formatLogEntry(entry);

    if (level === 'ERROR') {
      console.error(formatted);
    } else if (level === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  info(message: string, data?: Record<string, any>) {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: Record<string, any>) {
    this.log('WARN', message, data);
  }

  error(message: string, data?: Record<string, any>, error?: Error) {
    this.log('ERROR', message, data, error);
  }

  debug(message: string, data?: Record<string, any>) {
    this.log('DEBUG', message, data);
  }

  getRequestId(): string {
    return this.requestId;
  }
}

/**
 * Configuration checker - logs all critical env vars needed
 */
export function logConfigurationStatus(logger: DebugLogger) {
  const config = {
    resendApiKeyConfigured: !!process.env.RESEND_API_KEY,
    resendFromEmailConfigured: !!process.env.RESEND_FROM_EMAIL,
    supabaseUrlConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKeyConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nextPublicAppUrlConfigured: !!process.env.NEXT_PUBLIC_APP_URL,
    nodeEnv: process.env.NODE_ENV,
  };

  logger.info('Configuration Status', config);

  // Log warnings for missing critical configs
  if (!config.resendApiKeyConfigured) {
    logger.warn('RESEND_API_KEY is not configured - emails will NOT be sent', {
      note: 'Set RESEND_API_KEY in Vercel project settings under Variables',
    });
  }

  if (!config.resendFromEmailConfigured) {
    logger.warn('RESEND_FROM_EMAIL is not configured - using default domain', {
      note: 'For production, set RESEND_FROM_EMAIL to a verified sender email',
    });
  }

  if (!config.supabaseServiceRoleConfigured) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is not configured - database operations will fail', {
      note: 'This is CRITICAL - set it in Vercel project settings',
    });
  }

  return config;
}

/**
 * Email send tracing
 */
export function createEmailLogger(requestId?: string): DebugLogger {
  return new DebugLogger('EMAIL', requestId);
}

/**
 * Authentication tracing
 */
export function createAuthLogger(requestId?: string): DebugLogger {
  return new DebugLogger('AUTH', requestId);
}

/**
 * School approval tracing
 */
export function createApprovalLogger(requestId?: string): DebugLogger {
  return new DebugLogger('APPROVAL', requestId);
}

/**
 * Login tracing
 */
export function createLoginLogger(requestId?: string): DebugLogger {
  return new DebugLogger('LOGIN', requestId);
}

/**
 * Signup tracing
 */
export function createSignupLogger(requestId?: string): DebugLogger {
  return new DebugLogger('SIGNUP', requestId);
}

/**
 * School operations tracing
 */
export function createSchoolLogger(requestId?: string): DebugLogger {
  return new DebugLogger('SCHOOL', requestId);
}

/**
 * Configuration tracing
 */
export function createConfigLogger(requestId?: string): DebugLogger {
  return new DebugLogger('CONFIG', requestId);
}
