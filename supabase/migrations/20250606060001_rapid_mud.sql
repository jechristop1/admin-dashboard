-- Create uploads bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "authenticated can upload files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can view own files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can delete own files" ON storage.objects;

-- Create storage policies with proper path structure and validation
CREATE POLICY "authenticated can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'uploads' AND
    auth.uid()::text = (regexp_split_to_array(name, '/'))[1] AND
    array_length(regexp_split_to_array(name, '/'), 1) = 2 AND
    length(name) <= 255 AND
    (regexp_split_to_array(name, '/'))[2] ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]*$'
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