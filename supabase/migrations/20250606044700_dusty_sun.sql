-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage.objects policies using service role context
BEGIN;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "authenticated can upload files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can view own files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can delete own files" ON storage.objects;

-- Create new policies with correct path format checks
CREATE POLICY "authenticated can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'uploads' AND
    (SPLIT_PART(name, '/', 1) = auth.uid()::text)
);

CREATE POLICY "authenticated can view own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'uploads' AND
    (SPLIT_PART(name, '/', 1) = auth.uid()::text)
);

CREATE POLICY "authenticated can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'uploads' AND
    (SPLIT_PART(name, '/', 1) = auth.uid()::text)
);

COMMIT;