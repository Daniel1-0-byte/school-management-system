import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface SetupData {
  schoolId?: string;
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
    // Use service role to bypass auth requirement (this is for fresh signups with no session yet)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await request.json() as SetupData;

    if (!body.schoolId) {
      return NextResponse.json(
        { success: false, error: 'School ID is required' },
        { status: 400 }
      );
    }

    const schoolId = body.schoolId;

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
      return NextResponse.json(
        { success: false, error: 'Failed to update school information' },
        { status: 500 }
      );
    }

    // Create academic year record if it doesn't exist
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

    // Get userId from profile - profiles are created with role 'Admin'
    const { data: profileData, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId)
      .eq('system_role', 'Admin')
      .single();

    if (profileFetchError) {
      console.error('[v0][SETUP] Failed to find profile:', { 
        error: profileFetchError.message,
        schoolId 
      });
    }

    const userId = profileData?.id;

    // Create term records
    const terms = [
      { name: 'Term 1', start: body.terms.term1Start, end: body.terms.term1End },
      { name: 'Term 2', start: body.terms.term2Start, end: body.terms.term2End },
      { name: 'Term 3', start: body.terms.term3Start, end: body.terms.term3End },
    ];

    for (const term of terms) {
      await supabase
        .from('terms')
        .insert({
          school_id: schoolId,
          name: term.name,
          start_date: term.start,
          end_date: term.end,
        });
    }

    // Mark profile setup as complete
    if (userId) {
      console.log('[v0][SETUP] Marking setup complete for user:', { userId, schoolId });
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          setup_completed: true,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[v0][SETUP] Failed to update setup_completed:', { 
          error: updateError.message,
          userId 
        });
      } else {
        console.log('[v0][SETUP] Setup completed marked in database');
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
    } else {
      console.warn('[v0][SETUP] No userId found - setup_completed not marked!');
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: userId || null,
        schoolId,
        message: 'Setup completed successfully',
      },
    });
  } catch (error) {
    console.error('[v0][SETUP] Setup failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during setup' },
      { status: 500 }
    );
  }
}
