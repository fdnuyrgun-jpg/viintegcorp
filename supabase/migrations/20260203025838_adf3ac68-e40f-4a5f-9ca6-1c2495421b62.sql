-- Create wiki_folders table for document organization
CREATE TABLE public.wiki_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.wiki_categories(id) ON DELETE SET NULL,
  parent_folder_id UUID REFERENCES public.wiki_folders(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id to wiki_documents
ALTER TABLE public.wiki_documents 
ADD COLUMN folder_id UUID REFERENCES public.wiki_folders(id) ON DELETE SET NULL;

-- Create wiki_document_attachments table
CREATE TABLE public.wiki_document_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.wiki_documents(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploader_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wiki_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_document_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for wiki_folders
CREATE POLICY "Authenticated users can view folders" 
ON public.wiki_folders 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create folders" 
ON public.wiki_folders 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators or admins can update folders" 
ON public.wiki_folders 
FOR UPDATE 
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators or admins can delete folders" 
ON public.wiki_folders 
FOR DELETE 
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for wiki_document_attachments
CREATE POLICY "Authenticated users can view wiki attachments" 
ON public.wiki_document_attachments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can add attachments" 
ON public.wiki_document_attachments 
FOR INSERT 
WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Uploaders or admins can delete attachments" 
ON public.wiki_document_attachments 
FOR DELETE 
USING (auth.uid() = uploader_id OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on wiki_folders
CREATE TRIGGER update_wiki_folders_updated_at
BEFORE UPDATE ON public.wiki_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for wiki attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wiki-attachments', 'wiki-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for wiki-attachments bucket
CREATE POLICY "Wiki attachments are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'wiki-attachments');

CREATE POLICY "Authenticated users can upload wiki attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'wiki-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own wiki attachments" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'wiki-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);