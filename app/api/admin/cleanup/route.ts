import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface CleanupRequest {
  supabaseUrl: string;
  serviceRoleKey: string;
}

interface CleanupResult {
  success: boolean;
  message: string;
  deleted?: {
    authUsers: number;
    schools: number;
    profiles: number;
    requests: number;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<CleanupResult>> {
  try {
    const { supabaseUrl, serviceRoleKey } = (await request.json()) as CleanupRequest;

    console.log('[v0] Cleanup request received');

    // Validate inputs
    if (!supabaseUrl || !serviceRoleKey) {
      console.log('[v0] Missing credentials');
      return NextResponse.json(
        {
          success: false,
          message: 'Missing credentials',
          error: 'Supabase URL and service role key are required',
        },
        { status: 400 }
      );
    }

    console.log('[v0] Creating Supabase client with provided credentials');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Test connection
    console.log('[v0] Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('schools')
      .select('id', { count: 'exact', head: true });

    if (testError) {
      console.error('[v0] Connection test failed:', testError);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to connect to Supabase',
          error: testError.message,
        },
        { status: 400 }
      );
    }

    console.log('[v0] Connection successful');

    let deletedCount = {
      authUsers: 0,
      schools: 0,
      profiles: 0,
      requests: 0,
    };

    // Step 1: Get all auth users to delete
    console.log('[v0] Fetching auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('[v0] Error fetching auth users:', authError);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to fetch auth users',
          error: authError.message,
        },
        { status: 500 }
      );
    }

    console.log('[v0] Found auth users:', authUsers.users.length);

    // Step 2: Get profiles first to identify which auth users to delete
    console.log('[v0] Fetching profiles with schools...');
    const { data: profilesWithSchools, error: profileError } = await supabase
      .from('profiles')
      .select('id, auth_user_id, school_id')
      .not('school_id', 'is', null);

    if (profileError) {
      console.error('[v0] Error fetching profiles:', profileError);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to fetch profiles',
          error: profileError.message,
        },
        { status: 500 }
      );
    }

    const authUserIdsToDelete = new Set(
      profilesWithSchools?.map((p) => p.auth_user_id).filter(Boolean) || []
    );

    console.log('[v0] Auth users to delete:', authUserIdsToDelete.size);

    // Step 3: Delete school requests
    console.log('[v0] Deleting school requests...');
    const { count: requestCount, error: requestError } = await supabase
      .from('school_requests')
      .delete()
      .gt('id', '0');

    if (requestError) {
      console.error('[v0] Error deleting requests:', requestError);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to delete school requests',
          error: requestError.message,
        },
        { status: 500 }
      );
    }

    deletedCount.requests = requestCount || 0;
    console.log('[v0] Deleted school requests:', deletedCount.requests);

    // Step 4: Delete profiles with schools
    console.log('[v0] Deleting profiles...');
    const { count: profileCount, error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .not('school_id', 'is', null);

    if (deleteProfileError) {
      console.error('[v0] Error deleting profiles:', deleteProfileError);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to delete profiles',
          error: deleteProfileError.message,
        },
        { status: 500 }
      );
    }

    deletedCount.profiles = profileCount || 0;
    console.log('[v0] Deleted profiles:', deletedCount.profiles);

    // Step 5: Delete schools
    console.log('[v0] Deleting schools...');
    const { count: schoolCount, error: schoolError } = await supabase
      .from('schools')
      .delete()
      .gt('id', '0');

    if (schoolError) {
      console.error('[v0] Error deleting schools:', schoolError);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to delete schools',
          error: schoolError.message,
        },
        { status: 500 }
      );
    }

    deletedCount.schools = schoolCount || 0;
    console.log('[v0] Deleted schools:', deletedCount.schools);

    // Step 6: Delete auth users
    console.log('[v0] Deleting auth users...');
    let deletedAuthUsers = 0;

    for (const userId of authUserIdsToDelete) {
      try {
        console.log('[v0] Deleting auth user:', userId);
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

        if (deleteAuthError) {
          console.error('[v0] Error deleting auth user:', deleteAuthError);
        } else {
          deletedAuthUsers++;
        }
      } catch (err) {
        console.error('[v0] Exception deleting auth user:', err);
      }
    }

    deletedCount.authUsers = deletedAuthUsers;
    console.log('[v0] Deleted auth users:', deletedAuthUsers);

    // Verify deletion
    console.log('[v0] Verifying deletion...');
    const { count: newSchoolCount } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });

    const { count: newRequestCount } = await supabase
      .from('school_requests')
      .select('*', { count: 'exact', head: true });

    console.log('[v0] After cleanup - Schools:', newSchoolCount, 'Requests:', newRequestCount);

    console.log('[v0] Cleanup completed successfully');

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount.schools} schools, ${deletedCount.requests} requests, ${deletedCount.profiles} profiles, and ${deletedCount.authUsers} auth users. Schools can now retry registration with the same email addresses.`,
      deleted: deletedCount,
    });
  } catch (error) {
    console.error('[v0] Cleanup exception:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Cleanup failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
