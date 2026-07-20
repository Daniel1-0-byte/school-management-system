import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('sb-auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No session' },
        { status: 401 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, school_id, system_role, first_name, last_name, status, setup_completed')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    console.log('[v0][SESSION] Session verified:', {
      userId: user.id,
      email: user.email,
      role: profileData.system_role,
      setupCompleted: profileData.setup_completed,
    });

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
    console.error('[v0] Session check error:', error);
    return NextResponse.json(
      { success: false, error: 'Session check failed' },
      { status: 500 }
    );
  }
}
