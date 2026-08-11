import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getAuthenticatedProfile, getSchoolIdFromRequest, requireRole } from '@/lib/auth-utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export async function POST(request: NextRequest) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const submittedSchoolId = formData.get('schoolId');
    const requestSchoolId = await getSchoolIdFromRequest(request);
    const { profile, error: profileError } = await getAuthenticatedProfile(request);

    if (!(file instanceof File) || typeof submittedSchoolId !== 'string' || !submittedSchoolId) {
      return NextResponse.json({ error: 'A logo file and school ID are required' }, { status: 400 });
    }

    if (profileError || !profile || profile.status !== 'active' || profile.school_id !== submittedSchoolId || requestSchoolId !== submittedSchoolId) {
      return NextResponse.json({ error: 'You are not authorized to update this school' }, { status: 403 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    const supabase = getServerSupabaseClient();
    const extension = file.type.split('/')[1].replace('jpeg', 'jpg');
    const path = `${submittedSchoolId}/logo.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('school-logos')
      .upload(path, buffer, { contentType: file.type, cacheControl: '3600', upsert: true });

    if (uploadError) {
      console.error('[v0] School logo upload failed:', uploadError);
      return NextResponse.json({ error: 'Unable to upload school logo' }, { status: 500 });
    }

    const { data: publicUrl } = supabase.storage.from('school-logos').getPublicUrl(path);
    const { error: updateError } = await supabase
      .from('schools')
      .update({ logo_url: publicUrl.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', submittedSchoolId);

    if (updateError) {
      console.error('[v0] School logo record update failed:', updateError);
      return NextResponse.json({ error: 'Logo uploaded but could not be saved to the school record' }, { status: 500 });
    }

    return NextResponse.json({ url: publicUrl.publicUrl });
  } catch (error) {
    console.error('[v0] School logo upload error:', error);
    return NextResponse.json({ error: 'Unable to upload school logo' }, { status: 500 });
  }
}
