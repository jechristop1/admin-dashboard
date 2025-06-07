-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies directly on storage.objects
CREATE POLICY "Allow users to upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Allow users to read their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND
  auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Allow users to delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  auth.uid()::text = SPLIT_PART(name, '/', 1)
);