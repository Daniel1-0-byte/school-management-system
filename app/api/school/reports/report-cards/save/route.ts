import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * POST /api/school/reports/report-cards/save
 * Save or update a report card
 */
export async function POST(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    const body = await request.json();
    const {
      studentId,
      academicYearId,
      termId,
      totalScore,
      averageScore,
      letterGrade,
      ranking,
      teacherComment,
      principalSignature,
      conduct,
      interest,
      strength,
      improvement,
      presentDays,
      absentDays,
      totalSchoolDays,
    } = body;

    // Validate required fields
    if (!studentId || !academicYearId || !termId) {
      return NextResponse.json(
        { error: 'studentId, academicYearId, and termId are required' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();

    // Step 1: Check if report card already exists
    const { data: existingCard, error: checkError } = await supabase
      .from('report_cards')
      .select('id')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .eq('academic_year_id', academicYearId)
      .eq('term_id', termId)
      .maybeSingle();

    if (checkError) {
      console.error('[v0] Error checking existing report card:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing report card' },
        { status: 500 }
      );
    }

    const reportCardData = {
      school_id: schoolId,
      student_id: studentId,
      academic_year_id: academicYearId,
      term_id: termId,
      total_score: totalScore || null,
      average_score: averageScore || null,
      letter_grade: letterGrade || null,
      ranking: ranking || null,
      teacher_comment: teacherComment || null,
      conduct: conduct || null,
      interest: interest || null,
      strength: strength || null,
      improvement: improvement || null,
      principal_signature: principalSignature || false,
      present_days: presentDays ?? null,
      absent_days: absentDays ?? null,
      total_school_days: totalSchoolDays ?? null,
      generated_at: new Date().toISOString(),
    };

    let result;

    if (existingCard) {
      // Update existing report card
      const { data, error } = await supabase
        .from('report_cards')
        .update(reportCardData)
        .eq('id', existingCard.id)
        .select()
        .single();

      if (error) {
        console.error('[v0] Error updating report card:', error);
        return NextResponse.json(
          { error: 'Failed to update report card' },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Insert new report card
      const { data, error } = await supabase
        .from('report_cards')
        .insert([reportCardData])
        .select()
        .single();

      if (error) {
        console.error('[v0] Error creating report card:', error);
        return NextResponse.json(
          { error: 'Failed to create report card' },
          { status: 500 }
        );
      }

      result = data;
    }

    return NextResponse.json({
      success: true,
      reportCard: result,
    });
  } catch (error) {
    console.error('[v0] Save report card error:', error);
    return NextResponse.json(
      { error: 'Failed to save report card' },
      { status: 500 }
    );
  }
}
