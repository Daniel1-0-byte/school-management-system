-- Allow authenticated school admins to manage principal signatures in the public school-logos bucket.
-- Signature uploads use signatures/<admin-user-id>/... paths.

DROP POLICY IF EXISTS "Only school admins can upload logos" ON storage.objects;

CREATE POLICY "School admins can upload school assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-logos'
  AND (storage.foldername(name))[1] IN ('signatures', 'logos')
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.system_role = 'Admin'
  )
);

CREATE POLICY "School admins can update school assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'school-logos'
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.system_role = 'Admin'
  )
)
WITH CHECK (
  bucket_id = 'school-logos'
  AND (storage.foldername(name))[1] IN ('signatures', 'logos')
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.system_role = 'Admin'
  )
);

CREATE POLICY "School admins can delete school assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'school-logos'
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.system_role = 'Admin'
  )
);

CREATE POLICY "Public read access to school assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'school-logos');
