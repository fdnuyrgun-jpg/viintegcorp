-- Create task_comments table
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view task comments"
ON public.task_comments FOR SELECT
USING (true);

CREATE POLICY "Users can create comments"
ON public.task_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments or admins"
ON public.task_comments FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;