import { NextRequest, NextResponse } from 'next/server';
import {
  getServerSupabaseClient,
  queryAcademicYears,
  queryProfiles,
  querySchools,
} from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('sb-auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No session' },
        { status: 401 }
      );
    }

    // Use service role client to validate and refresh the session.
    const supabase = getServerSupabaseClient();
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;
    let {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    let refreshedSession: { access_token: string; refresh_token: string } | null = null;

    if (userError || !user) {
      if (!refreshToken) {
        return NextResponse.json(
          { success: false, error: 'Invalid session' },
          { status: 401 }
        );
      }

      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession({ refresh_token: refreshToken });

      if (refreshError || !refreshData.session || !refreshData.user) {
        console.error('[v0][SESSION] Token refresh failed:', {
          error: refreshError?.message,
        });
        return NextResponse.json(
          { success: false, error: 'Invalid session' },
          { status: 401 }
        );
      }

      refreshedSession = {
        access_token: refreshData.session.access_token,
        refresh_token: refreshData.session.refresh_token,
      };
      user = refreshData.user;
      userError = null;
    }

    // Fetch profile using service role (bypasses RLS)

    const { data: profileData, error: profileError } = await queryProfiles()
      .select('id, school_id, system_role, first_name, last_name, status, setup_completed, signature_url')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    const { data: schoolData, error: schoolError } = await querySchools()
      .select('id, name')
      .eq('id', profileData.school_id)
      .maybeSingle();

    if (schoolError) {
      console.error('[v0][SESSION] School lookup failed:', {
        error: schoolError.message,
      });
    }

    const { data: activeAcademicYear, error: academicYearError } = await queryAcademicYears()
      .select('id')
      .eq('school_id', profileData.school_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (academicYearError) {
      console.error('[v0][SESSION] Active academic year lookup failed:', {
        error: academicYearError.message,
      });
    }

    const response = NextResponse.json({
      success: true,
      session: {
        userId: user.id,
        email: user.email,
        role: profileData.system_role,
        schoolId: profileData.school_id,
        schoolName: schoolData?.name ?? null,
        academicYearId: activeAcademicYear?.id ?? null,
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

    if (refreshedSession) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      };

      response.cookies.set({
        ...cookieOptions,
        name: 'sb-auth-token',
        value: refreshedSession.access_token,
        maxAge: 60 * 60 * 24 * 7,
      });
      response.cookies.set({
        ...cookieOptions,
        name: 'sb-refresh-token',
        value: refreshedSession.refresh_token,
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    console.error('[v0][SESSION] Check failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Session check failed' },
      { status: 500 }
    );
  }
}
