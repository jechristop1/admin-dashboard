-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "authenticated can upload files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can view own files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can delete own files" ON storage.objects;

-- Create uploads bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies with proper path structure
CREATE POLICY "authenticated can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'uploads' AND
    auth.uid()::text = (regexp_split_to_array(name, '/'))[1]
);

CREATE POLICY "authenticated can view own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'uploads' AND
    auth.uid()::text = (regexp_split_to_array(name, '/'))[1]
);

CREATE POLICY "authenticated can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'uploads' AND
    auth.uid()::text = (regexp_split_to_array(name, '/'))[1]
);