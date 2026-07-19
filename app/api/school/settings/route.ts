import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const settingsSchema = z.object({
  name: z.string().min(1),
  address: z.string(),
  phone: z.string(),
  email: z.string().email(),
  principalName: z.string(),
  affiliation: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    // TODO: Fetch from Supabase
    const defaultSettings = {
      name: 'Example School',
      address: '123 School Street',
      phone: '+91-1234567890',
      email: 'info@school.edu',
      principalName: 'Dr. Sharma',
      affiliation: 'CBSE',
    };

    return NextResponse.json(defaultSettings);
  } catch (error) {
    console.error('[v0] Settings GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = settingsSchema.parse(body);

    // TODO: Save to Supabase
    return NextResponse.json({
      success: true,
      data: validatedData,
    });
  } catch (error) {
    console.error('[v0] Settings PUT error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
