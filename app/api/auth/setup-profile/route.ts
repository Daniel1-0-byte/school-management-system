import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';

interface SetupData {
  schoolDetails: {
    name: string;
    address: string;
    principalName: string;
    principalEmail: string;
    phone: string;
    website?: string;
  };
  academicYear: {
    year: number;
    startDate: string;
    endDate: string;
  };
  terms: {
    term1Start: string;
    term1End: string;
    term2Start: string;
    term2End: string;
    term3Start: string;
    term3End: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabaseClient();

    // Get authenticated user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error('[v0][SETUP] ❌ Not authenticated:', { error: userError });
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = userData.user.id;
    console.log('[v0][SETUP] Starting profile setup for user:', { userId });

    const body = await request.json() as SetupData;

    // Get user's profile and school
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('school_id, setup_completed')
      .eq('id', userId)
      .single();

    if (profileError || !profileData) {
      console.error('[v0][SETUP] ❌ Profile not found:', { userId, error: profileError });
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    const schoolId = profileData.school_id;

    console.log('[v0][SETUP] Updating school details:', {
      schoolId,
      schoolName: body.schoolDetails.name,
    });

    // Update school information
    const { error: schoolError } = await supabase
      .from('schools')
      .update({
        name: body.schoolDetails.name,
        address: body.schoolDetails.address,
        principal_name: body.schoolDetails.principalName,
        principal_email: body.schoolDetails.principalEmail,
        phone: body.schoolDetails.phone,
        website: body.schoolDetails.website || null,
      })
      .eq('id', schoolId);

    if (schoolError) {
      console.error('[v0][SETUP] ❌ School update error:', { schoolError, schoolId });
      return NextResponse.json(
        { success: false, error: 'Failed to update school information' },
        { status: 500 }
      );
    }

    console.log('[v0][SETUP] School updated successfully');

    // Create academic year record if it doesn't exist
    console.log('[v0][SETUP] Creating academic year:', {
      schoolId,
      year: body.academicYear.year,
    });

    const { error: academicYearError } = await supabase
      .from('academic_years')
      .insert({
        school_id: schoolId,
        year: body.academicYear.year,
        start_date: body.academicYear.startDate,
        end_date: body.academicYear.endDate,
      })
      .select()
      .single();

    if (academicYearError && !academicYearError.message.includes('duplicate')) {
      console.error('[v0][SETUP] ❌ Academic year creation error:', { academicYearError });
      // Continue anyway - academic year might already exist
    } else {
      console.log('[v0][SETUP] Academic year created successfully');
    }

    // Create term records
    const terms = [
      { name: 'Term 1', start: body.terms.term1Start, end: body.terms.term1End },
      { name: 'Term 2', start: body.terms.term2Start, end: body.terms.term2End },
      { name: 'Term 3', start: body.terms.term3Start, end: body.terms.term3End },
    ];

    console.log('[v0][SETUP] Creating school terms:', { schoolId, termCount: terms.length });

    for (const term of terms) {
      const { error: termError } = await supabase
        .from('school_terms')
        .insert({
          school_id: schoolId,
          name: term.name,
          start_date: term.start,
          end_date: term.end,
        });

      if (termError && !termError.message.includes('duplicate')) {
        console.warn('[v0][SETUP] ⚠️ Term creation warning:', { termError, term: term.name });
      }
    }

    // Mark profile setup as complete
    console.log('[v0][SETUP] Marking profile setup as complete:', { userId });

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        setup_completed: true,
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('[v0][SETUP] ❌ Profile update error:', { profileUpdateError, userId });
      return NextResponse.json(
        { success: false, error: 'Failed to complete setup' },
        { status: 500 }
      );
    }

    // Log audit entry
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: userId,
        action: 'complete_setup',
        target_type: 'school',
        target_id: schoolId,
        target_name: body.schoolDetails.name,
        school_id: schoolId,
      });

    console.log('[v0][SETUP] ✅ Profile setup COMPLETED successfully:', {
      userId,
      schoolId,
      schoolName: body.schoolDetails.name,
    });

    return NextResponse.json({
      success: true,
      data: {
        userId,
        schoolId,
        message: 'Setup completed successfully',
      },
    });
  } catch (error) {
    console.error('[v0][SETUP] ❌ Setup error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during setup' },
      { status: 500 }
    );
  }
}
