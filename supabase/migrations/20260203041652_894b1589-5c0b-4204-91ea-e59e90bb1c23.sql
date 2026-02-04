-- Create storage bucket for files if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Create policies for the files bucket
CREATE POLICY "Anyone can view files"
ON storage.objects FOR SELECT
USING (bucket_id = 'files');

CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);