import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient, queryProfiles } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('sb-auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No session' },
        { status: 401 }
      );
    }

    // Use service role client to get user info from token
    const supabase = getServerSupabaseClient();
    
    // Verify token is valid by setting it in auth header
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Fetch profile using service role (bypasses RLS)
    const { data: profileData, error: profileError } = await queryProfiles()
      .select('id, school_id, system_role, first_name, last_name, status, setup_completed')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        userId: user.id,
        email: user.email,
        role: profileData.system_role,
        setupCompleted: profileData.setup_completed,
      },
      data: {
        user: {
          id: user.id,
          email: user.email,
          profile: profileData,
        },
      },
    });
  } catch (error) {
    console.error('[v0][SESSION] Check failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Session check failed' },
      { status: 500 }
    );
  }
}
