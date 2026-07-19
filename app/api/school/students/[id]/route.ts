import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const studentUpdateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  classId: z.string(),
  rollNumber: z.string().optional(),
  status: z.enum(['active', 'graduated', 'withdrawn']),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // TODO: Fetch from Supabase
    const mockStudent = {
      id,
      firstName: 'Aarjav',
      lastName: 'Patel',
      email: 'aarjav@example.com',
      phone: '9876543210',
      dateOfBirth: '2008-05-15',
      gender: 'Male',
      classId: 'class-1',
      rollNumber: '001',
      status: 'active',
    };

    return NextResponse.json(mockStudent);
  } catch (error) {
    console.error('[v0] Student GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = studentUpdateSchema.parse(body);

    // TODO: Update in Supabase
    return NextResponse.json({
      success: true,
      data: { id, ...validatedData },
    });
  } catch (error) {
    console.error('[v0] Student PUT error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // TODO: Delete from Supabase
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Student DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}
