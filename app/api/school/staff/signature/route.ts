import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, requireRole, validateSchoolIdAccess } from '@/lib/auth-utils';

const BUCKET = 'teacher-signatures';

export async function POST(request: NextRequest) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;

  try {
    const schoolId = await getSchoolIdFromRequest(request);
    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const access = await validateSchoolIdAccess(schoolId);
    if (!access.valid) {
      return NextResponse.json({ error: access.error || 'Invalid school access' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const requestedSchoolId = formData.get('schoolId');
    const profileId = formData.get('profileId');
    const email = formData.get('email');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'A signature file is required' }, { status: 400 });
    }
    if (requestedSchoolId !== schoolId) {
      return NextResponse.json({ error: 'School ID does not match the current session' }, { status: 403 });
    }
    if (!profileId && !email) {
      return NextResponse.json({ error: 'Either profileId or email is required' }, { status: 400 });
    }

    const safeIdentifier = profileId
      ? String(profileId)
      : String(email).toLowerCase().replace(/[^a-z0-9._-]/g, '_');
    const extension = file.type === 'image/webp' ? 'webp' : file.type === 'image/jpeg' ? 'jpg' : 'png';
    const path = `${schoolId}/${safeIdentifier}.${extension}`;
    const supabase = getServerSupabaseClient();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });

    if (uploadError) {
      console.error('[v0] Server signature upload failed:', { bucket: BUCKET, path, error: uploadError });
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    if (profileId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ signature_url: path })
        .eq('id', String(profileId))
        .eq('school_id', schoolId);

      if (profileError) {
        console.error('[v0] Server signature profile update failed:', { profileId, schoolId, error: profileError });
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ path, bucket: BUCKET });
  } catch (error) {
    console.error('[v0] Server signature upload route failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Signature upload failed' }, { status: 500 });
  }
}
