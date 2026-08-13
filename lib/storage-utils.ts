import { getSupabaseClientSide } from './supabase';

/**
 * Upload image to Supabase Storage
 * @param bucket - Storage bucket name (e.g., 'school-logos', 'signatures')
 * @param file - File to upload
 * @param path - Path within bucket (e.g., '{schoolId}/logo.png')
 * @returns Public URL if successful, null on error
 */
export async function uploadImage(
  bucket: string,
  file: File,
  path: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    // Validate file
    if (!file) {
      return { url: null, error: 'No file selected' };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { url: null, error: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP' };
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { url: null, error: 'File size must be less than 5MB' };
    }

    const supabase = getSupabaseClientSide();

    // Upload file
    console.log('[v0] Supabase storage upload request:', {
      bucket,
      path,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    console.log('[v0] Supabase storage upload response:', {
      bucket,
      path,
      uploadedPath: data?.path || null,
      error: error
        ? { message: error.message, name: error.name, statusCode: error.statusCode }
        : null,
    });

    if (error) {
      console.error(`[v0] Upload to ${bucket} failed:`, error);
      return { url: null, error: error.message };
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: publicUrl.publicUrl,
      error: null,
    };
  } catch (error) {
    console.error('[v0] Image upload error:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete image from Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - Path within bucket
 */
export async function deleteImage(bucket: string, path: string): Promise<{ error: string | null }> {
  try {
    const supabase = getSupabaseClientSide();

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error(`[v0] Delete from ${bucket} failed:`, error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('[v0] Image delete error:', error);
    return {
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Get image preview from file
 * @param file - Image file
 * @returns Data URL for preview
 */
export function getImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
