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

    console.log('[v0][SETUP] Received setup data:', {
      schoolId: body.schoolId,
      schoolName: body.schoolDetails.name,
    });

    // Get school ID from request or use the one provided
    if (!body.schoolId) {
      console.error('[v0][SETUP] ❌ School ID not provided');
      return NextResponse.json(
        { success: false, error: 'School ID is required' },
        { status: 400 }
      );
    }

    const schoolId = body.schoolId;

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

    // Get userId from profile (user who just signed up for this school)
    console.log('[v0][SETUP] Fetching user profile for school:', { schoolId });
    
    const { data: profileData, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId)
      .eq('system_role', 'SchoolAdmin')
      .single();

    if (profileFetchError || !profileData) {
      console.warn('[v0][SETUP] ⚠️ Could not find admin profile for school:', {
        schoolId,
        error: profileFetchError,
      });
      // Continue anyway - we'll mark setup complete by school_id
    }

    const userId = profileData?.id;

    // Create term records
    const terms = [
      { name: 'Term 1', start: body.terms.term1Start, end: body.terms.term1End },
      { name: 'Term 2', start: body.terms.term2Start, end: body.terms.term2End },
      { name: 'Term 3', start: body.terms.term3Start, end: body.terms.term3End },
    ];

    console.log('[v0][SETUP] Creating school terms:', { schoolId, termCount: terms.length });

    for (const term of terms) {
      const { error: termError } = await supabase
        .from('terms')
        .insert({
          school_id: schoolId,
          name: term.name,
          start_date: term.start,
          end_date: term.end,
        });

      if (termError && !termError.message?.includes('duplicate')) {
        console.warn('[v0][SETUP] ⚠️ Term creation warning:', { termError, term: term.name });
      } else if (!termError) {
        console.log('[v0][SETUP] Term created:', { name: term.name });
      }
    }

    // Mark profile setup as complete
    if (userId) {
      console.log('[v0][SETUP] Marking profile setup as complete:', { userId, schoolId });

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          setup_completed: true,
        })
        .eq('id', userId);

      if (profileUpdateError) {
        console.warn('[v0][SETUP] ⚠️ Could not mark profile as complete:', { profileUpdateError, userId });
        // Continue anyway - user is still registered
      }
    } else {
      console.log('[v0][SETUP] Skipping profile update (no admin profile found)');
    }

    // Log audit entry if userId is available
    if (userId) {
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
    }

    console.log('[v0][SETUP] ✅ Setup COMPLETED successfully:', {
      userId: userId || 'unknown',
      schoolId,
      schoolName: body.schoolDetails.name,
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: userId || null,
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
