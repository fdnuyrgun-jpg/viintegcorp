-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for files bucket
CREATE POLICY "Authenticated users can view files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'files');

CREATE POLICY "Authenticated users can upload files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own files or admins" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'::public.app_role)));

-- Create file_folders table
CREATE TABLE public.file_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES public.file_folders(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id to files table
ALTER TABLE public.files ADD COLUMN folder_id UUID REFERENCES public.file_folders(id) ON DELETE SET NULL;

-- Enable RLS for file_folders
ALTER TABLE public.file_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for file_folders
CREATE POLICY "Authenticated users can view folders"
ON public.file_folders FOR SELECT
USING (true);

CREATE POLICY "Users can create folders"
ON public.file_folders FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators or admins can update folders"
ON public.file_folders FOR UPDATE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators or admins can delete folders"
ON public.file_folders FOR DELETE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on file_folders
CREATE TRIGGER update_file_folders_updated_at
BEFORE UPDATE ON public.file_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();