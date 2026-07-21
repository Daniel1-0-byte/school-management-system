import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client (anonymous key - respects RLS)
let supabaseClient: any = null;

export function getSupabaseClientSide() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Client Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      );
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

// Export for backward compatibility
export const supabase = {
  get instance() {
    return getSupabaseClientSide();
  },
};

// Server-side Supabase client (service role key - bypasses RLS)
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let serverSupabase: any = null;

export function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Server Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.'
    );
  }
  
  if (!serverSupabase) {
    serverSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  }
  
  return serverSupabase;
}

// Helper function to check if environment variables are set
export function validateSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('[v0] Validating Supabase config:', { 
    urlExists: !!supabaseUrl, 
    anonKeyExists: !!supabaseAnonKey 
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[v0] Client Supabase config missing:', {
      urlMissing: !supabaseUrl,
      anonKeyMissing: !supabaseAnonKey
    });
    throw new Error(
      'Client Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.'
    );
  }
}

// ============================================================================
// QUERY HELPERS FOR SERVER-SIDE USE
// ============================================================================

export function queryStudents() {
  return getServerSupabaseClient().from('students');
}

export function queryAttendance() {
  return getServerSupabaseClient().from('attendance_records');
}

export function queryGrades() {
  return getServerSupabaseClient().from('grade_entries');
}

export function queryClasses() {
  return getServerSupabaseClient().from('school_classes');
}

export function queryProfiles() {
  return getServerSupabaseClient().from('profiles');
}

export function querySchools() {
  return getServerSupabaseClient().from('schools');
}

export function queryAuditLogs() {
  return getServerSupabaseClient().from('audit_logs');
}

export function queryPlatformAdmins() {
  return getServerSupabaseClient().from('platform_admins');
}

export function querySchoolRequests() {
  return getServerSupabaseClient().from('school_requests');
}

export function queryNotifications() {
  return getServerSupabaseClient().from('notifications');
}

export function querySchoolSubscriptions() {
  return getServerSupabaseClient().from('school_subscriptions');
}

export function queryStaffInvitations() {
  return getServerSupabaseClient().from('staff_invitations');
}

// ============================================================================
// PAGINATION HELPER
// ============================================================================

export async function getPaginatedResults(
  query: any,
  page: number = 1,
  pageSize: number = 10
) {
  const offset = (page - 1) * pageSize;
  
  const { data, error, count } = await query
    .range(offset, offset + pageSize - 1)
    .limit(pageSize);

  return { data, error, count, page, pageSize };
}

// ============================================================================
// ERROR HANDLING HELPERS
// ============================================================================

export function formatSupabaseError(error: any) {
  return {
    message: error?.message || 'An error occurred',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  };
}

export function isErrorCode(error: any, code: string): boolean {
  return error?.code === code;
}

export const SUPABASE_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  DUPLICATE_SCHEMA: '42P06',
  UNDEFINED_TABLE: '42P01',
  PERMISSION_DENIED: '42501',
};
