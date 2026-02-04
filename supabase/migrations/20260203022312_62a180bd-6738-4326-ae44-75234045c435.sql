-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task attachments
CREATE POLICY "Authenticated users can view task attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own task attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);

-- Create table for task attachments
CREATE TABLE public.task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploader_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view task attachments"
ON public.task_attachments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can add attachments"
ON public.task_attachments FOR INSERT
WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Uploaders or admins can delete attachments"
ON public.task_attachments FOR DELETE
USING (auth.uid() = uploader_id OR has_role(auth.uid(), 'admin'::app_role));