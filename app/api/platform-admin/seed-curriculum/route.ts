import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-admin-middleware';
import { querySchools } from '@/lib/supabase';
import { seedDefaultCurriculum } from '@/lib/seed-curriculum';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    // Verify platform admin
    const adminIdOrError = await requirePlatformAdmin('curriculum:seed');
    if (adminIdOrError instanceof NextResponse) return adminIdOrError;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all schools
    const { data: schools, error: schoolError } = await querySchools()
      .select('id, name, status')
      .order('created_at', { ascending: false });

    if (schoolError) {
      return NextResponse.json(
        { error: 'Failed to fetch schools' },
        { status: 500 }
      );
    }

    if (!schools || schools.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No schools to seed',
        seeded: [],
        skipped: [],
      });
    }

    const seeded: string[] = [];
    const skipped: string[] = [];

    // Seed each school
    for (const school of schools) {
      try {
        // Check if school already has classes
        const { data: existingClasses, error: checkError } = await supabase
          .from('school_classes')
          .select('id')
          .eq('school_id', school.id)
          .limit(1);

        if (checkError) {
          console.error(`[v0] Error checking classes for ${school.name}:`, checkError);
          skipped.push(school.id);
          continue;
        }

        if (existingClasses && existingClasses.length > 0) {
          // School already has classes, skip
          skipped.push(school.id);
          continue;
        }

        // Seed curriculum
        console.log(`[v0] Seeding curriculum for school: ${school.name}`);
        await seedDefaultCurriculum(supabase, school.id);
        seeded.push(school.id);
      } catch (err) {
        console.error(`[v0] Error seeding school ${school.name}:`, err);
        skipped.push(school.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded curriculum for ${seeded.length} schools`,
      seeded,
      skipped,
    });
  } catch (error) {
    console.error('[v0] Seed curriculum error:', error);
    return NextResponse.json(
      { error: 'Failed to seed curriculum' },
      { status: 500 }
    );
  }
}
