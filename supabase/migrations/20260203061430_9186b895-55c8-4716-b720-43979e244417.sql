-- Fix files access: allow all authenticated users to view files (shared file storage)
DROP POLICY IF EXISTS "Users can view own files or admins all" ON public.files;

CREATE POLICY "Authenticated users can view files"
ON public.files
FOR SELECT
USING (auth.uid() IS NOT NULL);